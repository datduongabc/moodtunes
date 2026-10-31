import { Snackbar } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '@/store';
import { uiActions } from '@/store/uiSlice';

export function SnackHost() {
  const snack = useAppSelector((s) => s.ui.snack);
  const dispatch = useAppDispatch();
  return (
    <Snackbar visible={!!snack} onDismiss={() => dispatch(uiActions.snackDismissed())} duration={4000}>
      {snack?.text ?? ''}
    </Snackbar>
  );
}
