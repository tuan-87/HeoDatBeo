import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { getMascotImage } from "../utils/mascot";

interface FloatingMascotAIProps {
  mascot?: string;
  onPress: () => void;
}

const BUBBLE_SIZE = 54;
const MARGIN_X = 12;

export const FloatingMascotAI: React.FC<FloatingMascotAIProps> = ({
  mascot,
  onPress,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const LEFT_X = MARGIN_X;
  const RIGHT_X = screenWidth - BUBBLE_SIZE - MARGIN_X;

  // Giới hạn chiều dọc trong vùng trung tâm màn hình
  const MIN_Y = Math.max(140, screenHeight * 0.22);
  const MAX_Y = Math.min(screenHeight - 140, screenHeight * 0.72);

  // Vị trí thực tế lưu qua ref để không bị reset khi component re-render
  const positionRef = useRef({
    x: RIGHT_X,
    y: screenHeight * 0.45,
  });

  const pan = useRef(new Animated.ValueXY(positionRef.current)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Cập nhật vị trí nếu màn hình thay đổi kích thước
  useEffect(() => {
    const currentX = positionRef.current.x;
    const isAtRight = currentX > screenWidth / 2;
    const newX = isAtRight ? screenWidth - BUBBLE_SIZE - MARGIN_X : MARGIN_X;
    const newY = Math.max(MIN_Y, Math.min(MAX_Y, positionRef.current.y));

    positionRef.current = { x: newX, y: newY };
    pan.setValue({ x: newX, y: newY });
  }, [screenWidth, screenHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        // Phóng to nhẹ khi bắt đầu chạm/kéo
        Animated.spring(scale, {
          toValue: 1.1,
          friction: 5,
          tension: 80,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        let newX = positionRef.current.x + gestureState.dx;
        let newY = positionRef.current.y + gestureState.dy;

        // Giới hạn vùng trung tâm theo chiều dọc với hiệu ứng đàn hồi nhẹ (rubber band)
        if (newY < MIN_Y) {
          newY = MIN_Y - (MIN_Y - newY) * 0.2;
        } else if (newY > MAX_Y) {
          newY = MAX_Y + (newY - MAX_Y) * 0.2;
        }

        // Giới hạn chiều ngang không cho văng ra khỏi màn hình khi kéo
        if (newX < 0) newX = 0;
        if (newX > screenWidth - BUBBLE_SIZE) newX = screenWidth - BUBBLE_SIZE;

        pan.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gestureState) => {
        // Thu nhỏ lại kích thước chuẩn
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: false,
        }).start();

        // Kiểm tra xem là bấm (tap) hay kéo (drag)
        const isTap =
          Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;
        if (isTap) {
          onPress();
          return;
        }

        // Tính vị trí kết thúc khi thả tay
        const dropX = positionRef.current.x + gestureState.dx;
        const dropY = positionRef.current.y + gestureState.dy;

        // Ép vị trí Y vào vùng trung tâm an toàn
        const finalY = Math.max(MIN_Y, Math.min(MAX_Y, dropY));

        // Tự động hít (snap) về cạnh trái hoặc cạnh phải gần nhất (có xét vận tốc vuốt)
        let finalX = RIGHT_X;
        if (gestureState.vx < -0.4) {
          finalX = LEFT_X;
        } else if (gestureState.vx > 0.4) {
          finalX = RIGHT_X;
        } else {
          finalX = dropX + BUBBLE_SIZE / 2 < screenWidth / 2 ? LEFT_X : RIGHT_X;
        }

        positionRef.current = { x: finalX, y: finalY };

        // Hiệu ứng lò xo mượt mà hít vào cạnh
        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          friction: 6,
          tension: 45,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: false,
        }).start();
        Animated.spring(pan, {
          toValue: positionRef.current,
          friction: 6,
          tension: 45,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.bubble}>
        <Image
          source={getMascotImage(mascot)}
          style={styles.mascotImg}
          resizeMode="contain"
        />
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 9999,
    elevation: 10,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  mascotImg: {
    width: 38,
    height: 38,
  },
  aiBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  aiBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
});

export default FloatingMascotAI;
