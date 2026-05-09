import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useCommandCenterMotion} from './animations/useCommandCenterMotion';
import {CommandBackdrop} from './components/CommandBackdrop';
import {DiagnosticsPanel} from './diagnostics/DiagnosticsPanel';
import {CommandHubPanel} from './menu/CommandHubPanel';
import {
  MissionsStubPanel,
  OrganizationStubPanel,
  ProfileStubPanel,
  SettingsStubPanel,
} from './menu/stubPanels';
import {
  registerCommandCenterSmoothClose,
  useCommandCenterStore,
  type CommandPanelId,
} from './state/commandCenterStore';
import {GlassPanel} from '../../ui/components/GlassPanel';
import {useTheme} from '../../ui/theme/ThemeProvider';
import {ensureTerminalIngestAttached} from '../telemetry-terminal/state/terminalPacketStore';

export function CommandCenterRoot(): React.ReactElement | null {
  ensureTerminalIngestAttached();

  const storeOpen = useCommandCenterStore(s => s.open);
  const [mounted, setMounted] = useState(storeOpen);

  const handleLayerClosed = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (storeOpen) {
      setMounted(true);
    }
  }, [storeOpen]);

  if (!mounted) {
    return null;
  }

  return <CommandCenterLayer onClosed={handleLayerClosed} />;
}

function CommandCenterLayer({
  onClosed,
}: {
  onClosed: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {width: winW, height: winH} = useWindowDimensions();
  const panelId = useCommandCenterStore(s => s.activePanel);
  const goHub = useCommandCenterStore(s => s.goHub);
  const setOpen = useCommandCenterStore(s => s.setOpen);

  const {
    backdropOpacity,
    panelOpacity,
    panelScale,
    panelTranslateY,
    enter,
    exit,
  } = useCommandCenterMotion();

  const handleDoneClosing = useCallback(() => {
    setOpen(false);
    onClosed();
  }, [onClosed, setOpen]);

  const handleSmoothClose = useCallback(() => {
    Keyboard.dismiss();
    exit(handleDoneClosing);
  }, [exit, handleDoneClosing]);

  useEffect(() => {
    enter();
  }, [enter]);

  useEffect(() => {
    registerCommandCenterSmoothClose(handleSmoothClose);
    return () => {
      registerCommandCenterSmoothClose(null);
    };
  }, [handleSmoothClose]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const st = useCommandCenterStore.getState();
      if (!st.open) {
        return false;
      }
      Keyboard.dismiss();
      if (st.activePanel !== 'hub') {
        st.goHub();
        return true;
      }
      handleSmoothClose();
      return true;
    });
    return () => sub.remove();
  }, [handleSmoothClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [
      {scale: panelScale.value},
      {translateY: panelTranslateY.value},
    ],
  }));

  const title = useMemo(() => panelTitle(panelId), [panelId]);

  const expanded = panelId === 'diagnostics';

  const gutterL = Math.max(insets.left, theme.spacing.md);
  const gutterR = Math.max(insets.right, theme.spacing.md);
  const panelMaxW = Math.max(
    272,
    Math.min(expanded ? 560 : 432, winW - gutterL - gutterR),
  );

  const panelMaxH = expanded
    ? Math.min(winH * 0.78, winH - insets.top - insets.bottom - theme.spacing.lg * 2)
    : Math.min(winH * 0.62, 560);

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, {zIndex: 15}]}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <CommandBackdrop onPress={handleSmoothClose} />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          styles.panelStage,
          {
            paddingTop: insets.top + theme.spacing.sm,
            paddingBottom: insets.bottom + theme.spacing.sm,
            paddingLeft: gutterL,
            paddingRight: gutterR,
          },
        ]}>
        <Animated.View
          style={[
            styles.panelOuter,
            {
              width: '100%',
              maxWidth: panelMaxW,
              maxHeight: panelMaxH,
              ...(expanded ? {height: panelMaxH} : {}),
            },
            panelStyle,
          ]}
          pointerEvents="box-none">
          <GlassPanel
            intensity="strong"
            elevated
            style={[
              styles.panelInner,
              expanded ? styles.panelInnerExpanded : {},
            ]}>
            {panelId !== 'hub' ? (
              <PanelChrome title={title} onBack={goHub} theme={theme} />
            ) : null}
            <View
              style={[
                styles.panelBody,
                expanded ? styles.panelBodyExpanded : {},
              ]}>
              {renderPanel(panelId)}
            </View>
          </GlassPanel>
        </Animated.View>
      </View>
    </View>
  );
}

function panelTitle(id: CommandPanelId): string {
  switch (id) {
    case 'hub':
      return 'Command';
    case 'profile':
      return 'User / Session';
    case 'organization':
      return 'Organization';
    case 'missions':
      return 'Mission Operations';
    case 'diagnostics':
      return 'Diagnostics';
    case 'settings':
      return 'Settings';
    default:
      return 'Command';
  }
}

function renderPanel(id: CommandPanelId): React.ReactNode {
  switch (id) {
    case 'hub':
      return <CommandHubPanel />;
    case 'profile':
      return <ProfileStubPanel />;
    case 'organization':
      return <OrganizationStubPanel />;
    case 'missions':
      return <MissionsStubPanel />;
    case 'diagnostics':
      return <DiagnosticsPanel />;
    case 'settings':
      return <SettingsStubPanel />;
    default:
      return <CommandHubPanel />;
  }
}

function PanelChrome({
  title,
  onBack,
  theme,
}: {
  title: string;
  onBack: () => void;
  theme: ReturnType<typeof useTheme>;
}): React.JSX.Element {
  return (
    <View style={styles.chrome}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to hub"
        hitSlop={12}
        onPress={onBack}
        style={styles.backBtn}>
        <Text style={[styles.backTxt, {color: theme.palette.accentCyan}]}>
          ‹ HUB
        </Text>
      </Pressable>
      <Text
        style={[
          styles.chromeTitle,
          {color: theme.palette.fg100, letterSpacing: theme.typography.letterSpacing.wide},
        ]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panelStage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelOuter: {
    overflow: 'hidden',
    width: '100%',
  },
  panelInner: {
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
    width: '100%',
  },
  panelInnerExpanded: {
    flex: 1,
    maxHeight: '100%',
  },
  panelBody: {
    marginTop: 4,
    width: '100%',
  },
  panelBodyExpanded: {
    flex: 1,
    minHeight: 240,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  backBtn: {paddingVertical: 4, paddingRight: 8},
  backTxt: {fontSize: 13, fontWeight: '800'},
  chromeTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    flex: 1,
  },
});
