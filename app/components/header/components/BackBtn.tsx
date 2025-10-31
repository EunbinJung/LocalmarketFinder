import { Text, TouchableOpacity } from 'react-native';

interface Props {
  onPress: () => void;
}

function BackBtn({ onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>Back</Text>
    </TouchableOpacity>
  );
}

export default BackBtn;
