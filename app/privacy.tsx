import { useRouter } from 'expo-router';
import PrivacyScreen from '@/screens/PrivacyScreen';

export default function PrivacyRoute() {
  const router = useRouter();
  return <PrivacyScreen onBack={() => router.back()} />;
}
