import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { AnalyzingSpinner } from '../../src/components/voice/AnalyzingSpinner';
import { colors, fontFamily, fontSize, radius, spacing } from '../../src/theme/tokens';
import { useRole } from '../../src/state/RoleContext';
import { healthProfilesCollection, mealsCollection } from '../../src/mocks/db/collections';
import { createId } from '../../src/domain/id';
import {
  analyzeMockPhoto,
  assessMealFitness,
  inferMealSlot,
  suggestNextMeal,
  sumNutrients,
} from '../../src/mocks/nutritionAnalysis';

const ANALYSIS_DELAY_MS = 1500;

type Stage = 'idle' | 'analyzing';

function goHome() {
  router.replace('/elderly/home');
}

export default function CameraScreen() {
  const { activeUserId } = useRole();
  const userId = activeUserId ?? 'elderly-self';

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);

  async function analyzeAndSave(uri: string) {
    setStage('analyzing');
    await new Promise((resolve) => setTimeout(resolve, ANALYSIS_DELAY_MS));

    const now = new Date();
    const foods = analyzeMockPhoto();
    const totalNutrients = sumNutrients(foods);

    const profiles = await healthProfilesCollection.query((item) => item.userId === userId);
    const profile = profiles[profiles.length - 1] ?? null;

    const recentMeals = await mealsCollection.query((item) => item.userId === userId);
    const recentMealsSorted = [...recentMeals].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    const lastThreeMeals = recentMealsSorted.slice(0, 3);

    const { fitness, fitnessNote } = assessMealFitness(totalNutrients, profile);
    const slot = inferMealSlot(now);

    const meal = {
      id: createId('meal'),
      userId,
      slot,
      photoUri: uri,
      foods,
      totalNutrients,
      fitness,
      fitnessNote,
      nextMealSuggestion: suggestNextMeal(slot, profile, lastThreeMeals),
      recordedAt: now.toISOString(),
    };

    await mealsCollection.upsert(meal);
    setStage('idle');
    router.replace({ pathname: '/elderly/result', params: { mealId: meal.id } });
  }

  async function takePicture() {
    if (stage === 'analyzing' || !cameraReady) return;
    setError(null);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        await analyzeAndSave(photo.uri);
      }
    } catch {
      setError('사진을 찍지 못했어요. 다시 시도해 주세요.');
    }
  }

  async function pickFromLibrary() {
    if (stage === 'analyzing') return;
    setError(null);
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!media.granted) {
      setError('사진 보관함 접근 권한이 필요해요. 설정에서 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    await analyzeAndSave(result.assets[0].uri);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>식사가 잘 보이게{'\n'}찍어주세요</Text>

      <View style={styles.viewfinder}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.cameraFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission
                ? '카메라 권한이 필요해요.\n아래 버튼을 눌러 허용해 주세요.'
                : '카메라를 준비하고 있어요…'}
            </Text>
            {permission && !permission.granted && (
              <Pressable style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonLabel}>카메라 켜기</Text>
              </Pressable>
            )}
          </View>
        )}

        {stage === 'analyzing' && (
          <View style={styles.analyzingOverlay}>
            <AnalyzingSpinner />
            <Text style={styles.analyzingText}>AI가 분석하고 있어요…</Text>
          </View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actionsRow}>
        <Pressable onPress={goHome} disabled={stage === 'analyzing'}>
          <Text style={styles.cancelLabel}>취소</Text>
        </Pressable>
        <Pressable
          style={[styles.shutter, (!cameraReady || !permission?.granted) && styles.shutterDisabled]}
          onPress={takePicture}
          disabled={stage === 'analyzing' || !cameraReady || !permission?.granted}
          accessibilityRole="button"
          accessibilityLabel="사진 찍기"
        />
        <Pressable onPress={pickFromLibrary} disabled={stage === 'analyzing'}>
          <Text style={styles.libraryLabel}>갤러리</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cameraDark,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    color: colors.iconFillCream,
    fontSize: 24,
    fontFamily: fontFamily.extrabold,
    paddingHorizontal: spacing.lg,
    lineHeight: 30,
  },
  viewfinder: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.cameraBorderFaint,
    backgroundColor: colors.cameraDark2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  permissionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: spacing.lg,
  },
  permissionText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.body,
    color: colors.cameraTextFaint,
    textAlign: 'center',
    lineHeight: 26,
  },
  permissionButton: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  permissionButtonLabel: {
    color: colors.onPrimary,
    fontSize: fontSize.label,
    fontFamily: fontFamily.extrabold,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cameraScrim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  analyzingText: {
    color: colors.iconFillCream,
    fontSize: 21,
    fontFamily: fontFamily.bold,
  },
  error: {
    fontSize: fontSize.small,
    fontFamily: fontFamily.regular,
    color: colors.dangerBorder,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  cancelLabel: {
    color: colors.cameraTextFaint,
    fontSize: fontSize.label,
    fontFamily: fontFamily.bold,
    minWidth: 42,
  },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.iconFillCream,
    borderWidth: 5,
    borderColor: colors.cameraBorderFaint,
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  libraryLabel: {
    color: colors.cameraTextFaint,
    fontSize: fontSize.small,
    fontFamily: fontFamily.semibold,
    minWidth: 42,
    textAlign: 'right',
  },
});
