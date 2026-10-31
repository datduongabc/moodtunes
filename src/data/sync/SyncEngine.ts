import { isOfflineError } from '@/core/errors';
import { backoffMs } from '@/domain/outbox';
import { listPending, markAttempt, remove } from '@/data/local/outboxDao';
import { api } from '@/data/remote/api';
import { sendTagChange } from '@/data/remote/tags';
import type { AppDispatch, RootState } from '@/store';
import { networkActions } from '@/store/networkSlice';
import { tagsActions } from '@/store/tagsSlice';
import { uiActions } from '@/store/uiSlice';

/**
 * SyncEngine (CMP-APP-10). Sends outbox changes in creation order when online (AC-10.1.3).
 * PUT and DELETE are idempotent, so a repeated request after a lost response is harmless (AC-04.1.3).
 */
export class SyncEngine {
  private running = false;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private dispatch: AppDispatch,
    private getState: () => RootState,
  ) {}

  kick = () => {
    if (this.running) {
      this.again = true;
      return;
    }
    void this.run();
  };

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.kick, ms);
  }

  private async run() {
    if (!this.getState().network.online || this.getState().session.status !== 'signedIn') return;
    this.running = true;
    this.dispatch(networkActions.syncing(true));
    let sent = 0;
    try {
      for (const change of await listPending()) {
        const res = await sendTagChange(change);
        if (!('error' in res)) {
          await remove(change);
          this.dispatch(tagsActions.synced({ songId: change.songId, mood: change.mood }));
          sent++;
          continue;
        }
        const e = res.error;
        if (e.status === 404 || e.status === 400) {
          // the song no longer exists or the change is invalid: discard it (table 6.6)
          await remove(change);
          if (change.op === 'put') this.dispatch(tagsActions.tagRemoved({ songId: change.songId, mood: change.mood }));
          continue;
        }
        await markAttempt(change);
        if (e.status === 429) this.dispatch(uiActions.snack('Too many tags at once. Try again in a minute'));
        if (!isOfflineError(e) || e.status === 429) this.schedule(backoffMs(change.attempts + 1, e.retryAfterSec));
        break; // keep the order: stop at the first failure
      }
    } finally {
      this.running = false;
      this.dispatch(networkActions.syncing(false));
    }
    if (sent > 0) this.dispatch(api.util.invalidateTags(['Diary', 'Chart', 'Recs']));
    if (this.again) {
      this.again = false;
      this.kick();
    }
  }
}
