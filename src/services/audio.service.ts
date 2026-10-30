import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

let currentRecording: Audio.Recording | null = null;

export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const response = await Audio.requestPermissionsAsync();
    return response.granted;
  } catch (error) {
    console.error('Lỗi khi xin quyền microphone:', error);
    return false;
  }
}

export async function startRecording(): Promise<boolean> {
  try {
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      return false;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    if (currentRecording) {
      try {
        await currentRecording.stopAndUnloadAsync();
      } catch {}
      currentRecording = null;
    }

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    currentRecording = recording;
    return true;
  } catch (error) {
    console.error('Lỗi khi bắt đầu ghi âm:', error);
    return false;
  }
}

export async function stopRecording(): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (!currentRecording) return null;

    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();
    currentRecording = null;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch {}

    if (!uri) return null;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}

    return {
      base64,
      mimeType: 'audio/mp4',
    };
  } catch (error) {
    console.error('Lỗi khi dừng ghi âm:', error);
    currentRecording = null;
    return null;
  }
}

export async function cancelRecording(): Promise<void> {
  try {
    if (currentRecording) {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      currentRecording = null;
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
  } catch (e) {
    console.warn('Lỗi khi huỷ ghi âm:', e);
  } finally {
    currentRecording = null;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
  }
}
