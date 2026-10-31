import { Banner } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '@/store';
import { uiActions } from '@/store/uiSlice';

/** Shown once per threshold; playback continues (AC-08.1.3). */
export function BatteryBanner() {
  const banner = useAppSelector((s) => s.ui.batteryBanner);
  const dispatch = useAppDispatch();
  return (
    <Banner
      visible={banner !== null}
      icon={banner === 'empty' ? 'battery-outline' : 'battery-20'}
      actions={[{ label: 'Dismiss', onPress: () => dispatch(uiActions.batteryBanner(null)) }]}
    >
      {banner === 'empty' ? "You've reached today's goal. Time for a break?" : "20% of today's listening time left"}
    </Banner>
  );
}
