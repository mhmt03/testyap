import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function FilteredImage({ uri, colorMode, style, resizeMode = 'contain' }) {
  if (colorMode === 'original' || !colorMode) {
    return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
  }

  let filterCss = 'none';
  if (colorMode === 'grayscale') {
    filterCss = 'grayscale(100%)';
  } else if (colorMode === 'blackwhite') {
    // CamScanner / Fotokopi Efekti: Gri gölgeleri siler, kağıdı saf beyaz yapar (#FFFFFF) ve yazıları siyaha keskinleştirir (#000000)
    filterCss = 'grayscale(100%) contrast(280%) brightness(125%)';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { width: 100%; height: 100%; background: #000000; display: flex; justify-content: center; align-items: center; overflow: hidden; }
        img { max-width: 100%; max-height: 100%; object-fit: ${resizeMode}; filter: ${filterCss}; }
      </style>
    </head>
    <body>
      <img src="${uri}" />
    </body>
    </html>
  `;

  return (
    <View style={style}>
      <WebView
        originWhitelist={['*']}
        allowFileAccess={true}
        allowingReadAccessToURL="*"
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: '#000000' }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
