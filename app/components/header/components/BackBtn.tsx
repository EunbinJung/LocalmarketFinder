import { TouchableOpacity } from 'react-native';
import PrevIcon from '../../../assets/icons/prev.svg';

interface Props {
  onPress: () => void;
}

function BackBtn({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <PrevIcon width={28} height={28} />
    </TouchableOpacity>
  );
}

export default BackBtn;
