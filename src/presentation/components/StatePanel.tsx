import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { color, space } from '../theme/tokens';
import { Txt } from './Txt';

/** Empty and error states (A01 section 7.2, standard states). */
export function StatePanel({
  icon,
  title,
  body,
  action,
  onAction,
  testID,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.wrap} testID={testID}>
      <MaterialCommunityIcons name={icon as never} size={48} color={color.onSurfaceVariant} />
      <Txt variant="titleMedium" style={styles.center}>
        {title}
      </Txt>
      {body ? (
        <Txt muted style={styles.center}>
          {body}
        </Txt>
      ) : null}
      {action && onAction ? (
        <Button mode="contained-tonal" onPress={onAction} style={styles.button}>
          {action}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: space.empty, gap: space.tight },
  center: { textAlign: 'center' },
  button: { marginTop: space.tight },
});
