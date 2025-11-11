import { TouchableOpacity } from 'react-native';
import LocationIcon from '../../../assets/icons/location.svg';

function LocationBtn() {
  return (
    <TouchableOpacity className="w-15 h-15 bg-tertiary shadow-md p-4 rounded-full items-center justify-center">
      <LocationIcon width={28} height={28} />
    </TouchableOpacity>
  );
}

export default LocationBtn;
