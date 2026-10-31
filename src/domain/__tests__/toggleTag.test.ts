import { makeToggleTag, type ExistingTag, type ToggleTagPorts } from '../usecases/toggleTag';
import type { OutboxChange } from '../outbox';
import type { Mood } from '../types';

function setup() {
  const tags = new Map<string, ExistingTag>();
  const queue: Omit<OutboxChange, 'attempts'>[] = [];
  let syncs = 0;
  let t = 1000;
  const ports: ToggleTagPorts = {
    getTag: (s, m) => tags.get(`${s}:${m}`),
    defaultContext: () => 'work',
    showOn: (s, m, tag) => void tags.set(`${s}:${m}`, tag),
    showOff: (s, m) => void tags.delete(`${s}:${m}`),
    enqueue: async (c) => void queue.push(c),
    sync: () => void syncs++,
    now: () => ++t,
  };
  return { toggle: makeToggleTag(ports), tags, queue, syncs: () => syncs };
}

describe('ToggleTag use case (FR-04, SD-02)', () => {
  it('adds a tag at once, queues a PUT with the current context and syncs (AC-04.1.1)', async () => {
    const h = setup();
    expect(await h.toggle(7, 'focused')).toBe(true);
    expect(h.tags.has('7:focused')).toBe(true);
    expect(h.queue[0]).toMatchObject({ songId: 7, mood: 'focused', op: 'put', context: 'work' });
    expect(h.syncs()).toBe(1);
  });
  it('removes the tag on a second tap (AC-04.1.2)', async () => {
    const h = setup();
    await h.toggle(7, 'focused');
    expect(await h.toggle(7, 'focused')).toBe(false);
    expect(h.tags.has('7:focused')).toBe(false);
    expect(h.queue[1]).toMatchObject({ op: 'delete', note: null });
  });
  it('keeps an existing note unless a new one is given (AC-04.1.4)', async () => {
    const h = setup();
    await h.toggle(7, 'sad' as Mood, { note: 'Rainy day' });
    await h.toggle(7, 'sad', { forceOn: true });
    expect(h.queue[1]).toMatchObject({ op: 'put', note: 'Rainy day' });
  });
});
