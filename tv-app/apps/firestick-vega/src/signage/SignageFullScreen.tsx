import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignageHeader } from './SignageHeader';
import { BarLogo } from '../components/BarLogo';
import { Logo } from '../components/Logo';
import type { SignageSlide } from '../services/api';
import { fonts, tvFontSizes } from '../theme/typography';
import { colors, w } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface Props {
  slides: SignageSlide[];
  currentIndex: number;
  barCode: string;
  barName: string;
  logoUrl?: string | null;
  secondsUntilNextGame?: number;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.barName !== next.barName || prev.logoUrl !== next.logoUrl || prev.barCode !== next.barCode) return false;
  // Only re-render when the displayed minute changes (prevents re-render on every 15s poll)
  if (Math.floor((prev.secondsUntilNextGame || 0) / 60) !== Math.floor((next.secondsUntilNextGame || 0) / 60)) return false;
  if (prev.currentIndex !== next.currentIndex || prev.slides.length !== next.slides.length) return false;
  // Compare only the currently visible slide content
  const pi = prev.currentIndex % Math.max(1, prev.slides.length);
  const ni = next.currentIndex % Math.max(1, next.slides.length);
  return JSON.stringify(prev.slides[pi]) === JSON.stringify(next.slides[ni]);
}

/**
 * SignageHeader is rendered ONCE at the top level and stays mounted across
 * slide rotations. Previously each slide template rendered its own SignageHeader,
 * which caused BarLogo (Image) to unmount/remount on every slide change,
 * triggering notifyImageLoadSuccess + 100-177 native shadow tree mutations.
 */
export const SignageFullScreen = React.memo(function SignageFullScreen({
  slides, currentIndex, barCode, barName, logoUrl, secondsUntilNextGame,
}: Props) {
  const headerProps = { barName, logoUrl, secondsUntilNextGame };
  const slide = slides.length > 0 ? slides[currentIndex % slides.length] : null;

  return (
    <View style={fs.fill}>
      <SignageHeader {...headerProps} />
      {!slide
        ? <DefaultBrandedContent />
        : renderSlideContent(slide, barCode, barName, logoUrl)}
    </View>
  );
}, arePropsEqual);

// ─── Slide content renderer (no headers — handled by parent) ─────────

function renderSlideContent(slide: SignageSlide, barCode: string, barName: string, logoUrl?: string | null): React.ReactNode {
  switch (slide.template) {
    case 'specials':   return <SpecialsContent slide={slide} />;
    case 'happyhour':  return <HappyHourContent slide={slide} />;
    case 'event':      return <EventContent slide={slide} />;
    case 'brand':      return <BrandContent slide={slide} barName={barName} logoUrl={logoUrl} />;
    case 'announcement': return <AnnouncementContent slide={slide} />;
    case 'sports':     return <SportsContent slide={slide} />;
    case 'custom':     return <CustomContent slide={slide} />;
    default:           return <DefaultBrandedContent />;
  }
}

// ─── Default Branded Content ─────────────────────────────────────────

function DefaultBrandedContent() {
  return (
    <View style={fs.center}>
      <Text style={{ fontSize: 128, marginBottom: 16 }}>🧠</Text>
      <Text style={[fs.label, { color: colors.blue }]}>EVERY 15 MINUTES</Text>
      <Text style={fs.headline}>Play TapTrivia!</Text>
      <Text style={fs.subtitle}>Free to play · Win prizes · Have fun</Text>
      <Text style={fs.subtext}>Scan the QR code on screen or visit play.taptrivia.tv</Text>
      <PoweredBy />
    </View>
  );
}

// ─── Specials ─────────────────────────────────────────────────────────

function SpecialsContent({ slide }: { slide: any }) {
  return (
    <View style={fs.content}>
      <View style={fs.leftCol}>
        <Text style={[fs.label, { color: '#f59e0b' }]}>
          {slide.emoji || ''} {slide.customLabel || "Today's Specials"}
        </Text>
        <Text style={fs.headline}>{slide.headline || ''}</Text>
        {slide.subheadline ? (
          <Text style={fs.subheadline}>{slide.subheadline}</Text>
        ) : null}
        {slide.featured && (
          <View style={fs.featured}>
            <View style={{ flex: 1 }}>
              <Text style={fs.featuredName}>{slide.featured.name || ''}</Text>
              {slide.featured.desc ? <Text style={fs.featuredDesc}>{slide.featured.desc}</Text> : null}
            </View>
            <Text style={fs.featuredPrice}>{slide.featured.price || ''}</Text>
          </View>
        )}
      </View>
      <View style={fs.rightCol}>
        {(slide.items || []).map((item: any, i: number) => (
          <View key={i} style={fs.menuItem}>
            <Text style={fs.menuIcon}>{item.icon || ''}</Text>
            <View style={{ flex: 1 }}>
              <Text style={fs.menuName}>{item.name || ''}</Text>
              {item.desc ? <Text style={fs.menuDesc}>{item.desc}</Text> : null}
            </View>
            <Text style={fs.menuPrice}>{item.price || ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Happy Hour ───────────────────────────────────────────────────────

function HappyHourContent({ slide }: { slide: any }) {
  return (
    <View style={fs.center}>
      <Text style={[fs.label, { color: '#f59e0b' }]}>{slide.emoji || ''} Happy Hour</Text>
      <Text style={fs.headline}>{slide.when || slide.title || ''}</Text>
      <Text style={fs.subtitle}>{slide.tagline || ''}</Text>
      <View style={fs.dealsRow}>
        {(slide.deals || slide.items || []).map((deal: any, i: number) => (
          <View key={i} style={fs.deal}>
            <Text style={[fs.dealValue, { color: '#f59e0b' }]}>{deal.value || deal.price || ''}</Text>
            <Text style={fs.dealItem}>{deal.name || ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Event ────────────────────────────────────────────────────────────

function EventContent({ slide }: { slide: any }) {
  return (
    <View style={fs.center}>
      <Text style={fs.bigEmoji}>{slide.emoji || ''}</Text>
      <Text style={[fs.label, { color: colors.blue }]}>{slide.when || ''}</Text>
      <Text style={fs.headline}>{slide.headline || slide.title || ''}</Text>
      <Text style={fs.subtitle}>{slide.message || ''}</Text>
      {(slide.prize || slide.items || []).length > 0 && (
        <View style={fs.prizesRow}>
          {(slide.prize || slide.items || []).map((p: any, i: number) => (
            <View key={i} style={fs.prize}>
              <Text style={fs.prizeEmoji}>{p.emoji || ''}</Text>
              <Text style={fs.prizePlace}>{p.place || ''}</Text>
              {p.label ? <Text style={fs.prizeLabel}>{p.label}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Brand ────────────────────────────────────────────────────────────

function BrandContent({ slide, barName, logoUrl }: { slide: any; barName: string; logoUrl?: string | null }) {
  return (
    <View style={fs.center}>
      <BarLogo logoUrl={logoUrl} barName={barName} size={280} style={{ marginBottom: 32 }} />
      <Text style={fs.headline}>{barName}</Text>
      <Text style={[fs.subtitle, { letterSpacing: 4, textTransform: 'uppercase', fontSize: 32 }]}>
        {slide.tagline || ''}
      </Text>
      <View style={fs.dividerLine} />
      {(slide.hours || slide.items || []).length > 0 && (
        <View style={fs.hoursGrid}>
          {(slide.hours || slide.items || []).map((h: any, i: number) => (
            <View key={i} style={fs.hoursItem}>
              <Text style={fs.hoursLabel}>{h.day || h.label || ''}</Text>
              <Text style={fs.hoursValue}>{h.hours || h.name || ''}</Text>
            </View>
          ))}
        </View>
      )}
      <PoweredBy />
    </View>
  );
}

// ─── Announcement ─────────────────────────────────────────────────────

function AnnouncementContent({ slide }: { slide: any }) {
  return (
    <View style={fs.center}>
      <Text style={fs.bigEmoji}>{slide.emoji || ''}</Text>
      <Text style={fs.headline}>{slide.headline || ''}</Text>
      <Text style={fs.body}>{slide.message || ''}</Text>
      {slide.subtext ? <Text style={fs.subtext}>{slide.subtext}</Text> : null}
    </View>
  );
}

// ─── Sports ───────────────────────────────────────────────────────────

function SportsContent({ slide }: { slide: any }) {
  return (
    <View style={fs.center}>
      <Text style={fs.bigEmoji}>{slide.emoji || ''}</Text>
      <Text style={[fs.label, { color: colors.red }]}>{slide.headline || 'Game Day'}</Text>
      <Text style={fs.headline}>{slide.matchup || slide.title || ''}</Text>
      <Text style={fs.subtitle}>{slide.when || ''}</Text>
      <Text style={fs.promo}>{slide.message || slide.promo || ''}</Text>
      {slide.tagline ? <Text style={fs.subtext}>{slide.tagline}</Text> : null}
    </View>
  );
}

// ─── Custom ───────────────────────────────────────────────────────────

function CustomContent({ slide }: { slide: any }) {
  return (
    <View style={fs.center}>
      <Text style={fs.bigEmoji}>{slide.emoji || ''}</Text>
      <Text style={fs.headline}>{slide.headline || ''}</Text>
      <Text style={fs.body}>{slide.body || slide.message || ''}</Text>
      {(slide.items || []).map((item: any, i: number) => (
        <View key={i} style={fs.customItem}>
          <Text style={fs.customEmoji}>{item.emoji || ''}</Text>
          <Text style={fs.customText}>{item.name || item.label || ''}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────

function PoweredBy() {
  return (
    <View style={fs.powered}>
      <Logo size="sm" />
      <View style={fs.poweredSep} />
      <Text style={fs.poweredText}>Powered by TapTrivia</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const fs = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 80,
    paddingBottom: 60,
  },
  leftCol: { flex: 1.1, justifyContent: 'center', paddingRight: 40 },
  rightCol: { flex: 0.9, justifyContent: 'center', gap: 24 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 80,
  },
  label: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  headline: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 88,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 36,
    color: w(0.5),
    textAlign: 'center',
    marginBottom: 24,
  },
  subheadline: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 88,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: fonts.outfit.medium,
    fontSize: 40,
    color: w(0.55),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 52,
  },
  subtext: {
    fontFamily: fonts.outfit.regular,
    fontSize: 28,
    color: w(0.3),
    textAlign: 'center',
    marginTop: 16,
  },
  bigEmoji: {
    fontSize: 128,
    marginBottom: 24,
  },
  promo: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 32,
    color: colors.gold,
    textAlign: 'center',
    marginTop: 16,
  },
  // Menu items (specials)
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 36,
    gap: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: { fontSize: 56 },
  menuName: { fontFamily: fonts.outfit.semiBold, fontSize: 32, color: '#ffffff' },
  menuDesc: { fontFamily: fonts.outfit.regular, fontSize: 26, color: w(0.5), marginTop: 4 },
  menuPrice: { fontFamily: fonts.fredoka.bold, fontSize: 44, color: colors.green },
  // Featured
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 40,
    paddingVertical: 40,
    paddingHorizontal: 48,
    marginTop: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featuredName: { fontFamily: fonts.outfit.bold, fontSize: 44, color: '#ffffff' },
  featuredDesc: { fontFamily: fonts.outfit.regular, fontSize: 26, color: w(0.4), marginTop: 8 },
  featuredPrice: { fontFamily: fonts.fredoka.bold, fontSize: 72, color: colors.green },
  // Deals
  dealsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 40, marginTop: 24 },
  deal: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 36,
    paddingVertical: 48,
    paddingHorizontal: 56,
    minWidth: 320,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dealValue: { fontFamily: fonts.fredoka.bold, fontSize: 64 },
  dealItem: { fontFamily: fonts.outfit.medium, fontSize: 28, color: w(0.7), marginTop: 8 },
  // Prizes
  prizesRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 24 },
  prize: {
    alignItems: 'center',
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  prizeEmoji: { fontSize: 56, marginBottom: 8 },
  prizePlace: { fontFamily: fonts.fredoka.bold, fontSize: 32, color: colors.gold },
  prizeLabel: { fontFamily: fonts.outfit.regular, fontSize: 24, color: w(0.5), marginTop: 4 },
  // Hours
  hoursGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 64, marginTop: 16 },
  hoursItem: { alignItems: 'center', minWidth: 140 },
  hoursLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 26, color: w(0.5), marginBottom: 4 },
  hoursValue: { fontFamily: fonts.outfit.semiBold, fontSize: 30, color: colors.gold },
  dividerLine: { width: 120, height: 6, backgroundColor: w(0.2), marginVertical: 24 },
  // Custom items
  customItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  customEmoji: { fontSize: 32, marginRight: 16 },
  customText: { fontFamily: fonts.outfit.medium, fontSize: 32, color: w(0.8) },
  // Powered
  powered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'center',
    marginBottom: 40,
  },
  poweredSep: { width: 2, height: 40, backgroundColor: w(0.15), marginHorizontal: 16 },
  poweredText: { fontFamily: fonts.outfit.medium, fontSize: 24, color: w(0.4) },
});
