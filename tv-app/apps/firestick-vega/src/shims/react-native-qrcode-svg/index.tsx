/**
 * QRCode shim for Vega OS.
 * Renders a static pre-bundled QR code image.
 */
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const qrImage = require('../../../assets/image/qr-play-taptrivia.png');

interface Props {
  value?: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
}

function QRCode({ size = 100, backgroundColor = 'white' }: Props) {
  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
      <Image
        source={qrImage}
        style={{ width: size - 8, height: size - 8 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QRCode;
