import { Redirect } from 'expo-router';

// Auth is handled entirely in sign-in.tsx as a unified screen with mode switching.
export default function SignUp() {
  return <Redirect href="/(auth)/sign-in" />;
}
