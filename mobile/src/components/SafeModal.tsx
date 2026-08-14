import React from 'react';
import { Modal, ModalProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Thin wrapper around RN's Modal that pads its content away from the status
// bar / notch and the bottom gesture bar. Modal renders into its own native
// overlay window, entirely outside the app's normal view tree, so the
// app-wide safe-area wrapper in App.tsx can't reach it -- every modal needs
// this applied individually at this one point instead.
export const SafeModal = ({ children, ...props }: ModalProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal {...props}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {children}
      </View>
    </Modal>
  );
};
