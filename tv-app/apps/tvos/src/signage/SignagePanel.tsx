import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignagePanelHeader } from './SignageHeader';
import { QRBadge } from '../components/QRBadge';
import { BarLogo } from '../components/BarLogo';
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
}

export function SignagePanel({ slides, currentIndex, barCode, barName, logoUrl }: Props) {
  if (slides.length === 0) {
    return (
      <View style={pn.panel}>
        <SignagePanelHeader barName={barName} logoUrl={logoUrl} />
        <View style={pn.center}>
          <QRBadge barCode={barCode} variant="inline" />
        </View>
      </View>
    );
  }

  const slide = slides[currentIndex % slides.length];
  if (!slide) return null;

  return (
    <View style={pn.panel}>
      <SignagePanelHeader barName={barName} logoUrl={logoUrl} />
      <PanelContent slide={slide} barCode={barCode} barName={barName} logoUrl={logoUrl} />
      <View style={pn.qrFooter}>
        <QRBadge barCode={barCode} variant="inline" />
      </View>
    </View>
  );
}

function PanelContent({ slide, barCode, barName, logoUrl }: {
  slide: SignageSlide; barCode: string; barName: string; logoUrl?: string | null;
}) {
  switch (slide.template) {
    case 'specials':
      return <SpecialsPanel slide={slide} />;
    case 'happyhour':
      return <HappyHourPanel slide={slide} />;
    case 'event':
      return <EventPanel slide={slide} />;
    case 'brand':
      return <BrandPanel slide={slide} barName={barName} logoUrl={logoUrl} />;
    case 'announcement':
      return <AnnouncementPanel slide={slide} />;
    case 'sports':
      return <SportsPanel slide={slide} />;
    case 'custom':
      return <CustomPanel slide={slide} />;
    default:
      return null;
  }
}

function SpecialsPanel({ slide }: { slide: SignageSlide }) {
  return (
    <View style={pn.content}>
      <Text style={[pn.label, { color: '#f59e0b' }]}>
        {slide.emoji || ''} {slide.customLabel || "Tonight's Specials"}
      </Text>
      {slide.featured && (
        <View style={pn.featured}>
          <Text style={pn.featuredName}>{slide.featured.name || ''}</Text>
          <Text style={pn.featuredPrice}>{slide.featured.price || ''}</Text>
        </View>
      )}
      {(slide.items || []).map((item, i) => (
        <View key={i} style={pn.menuItem}>
          <Text style={pn.menuIcon}>{item.icon || ''}</Text>
          <Text style={pn.menuName} numberOfLines={1}>{item.name || ''}</Text>
          <Text style={pn.menuPrice}>{item.price || ''}</Text>
        </View>
      ))}
    </View>
  );
}

function HappyHourPanel({ slide }: { slide: SignageSlide }) {
  const deals = (slide.deals || slide.items || []) as Array<Record<string, any>>;
  return (
    <View style={pn.content}>
      <Text style={[pn.label, { color: '#e879f9' }]}>{slide.emoji || ''} Happy Hour</Text>
      <Text style={pn.headline}>{slide.when || slide.title || ''}</Text>
      <Text style={pn.subtitle}>{slide.tagline || ''}</Text>
      {deals.map((deal, i) => (
        <View key={i} style={pn.deal}>
          <Text style={[pn.dealValue, { color: '#f59e0b' }]}>{deal.value || deal.price || deal.deal || ''}</Text>
          <Text style={pn.dealItem}>{deal.name || deal.item || ''}</Text>
        </View>
      ))}
    </View>
  );
}

function EventPanel({ slide }: { slide: SignageSlide }) {
  return (
    <View style={[pn.content, { alignItems: 'center' }]}>
      <Text style={[pn.label, { color: colors.blue }]}>{slide.emoji || ''} Coming Up</Text>
      <View style={pn.eventCenter}>
        <Text style={pn.emoji}>{slide.emoji || ''}</Text>
        <Text style={[pn.label, { color: colors.blue }]}>{slide.when || ''}</Text>
        <Text style={pn.headline}>{slide.headline || slide.title || ''}</Text>
        <Text style={pn.subtitle}>{slide.message || ''}</Text>
      </View>
    </View>
  );
}

function BrandPanel({ slide, barName, logoUrl }: { slide: SignageSlide; barName: string; logoUrl?: string | null }) {
  const hours = (slide.hours || slide.items || []) as Array<Record<string, any>>;
  return (
    <View style={[pn.content, { alignItems: 'center' }]}>
      <BarLogo logoUrl={logoUrl} barName={barName} size={160} style={{ marginBottom: 20 }} />
      <Text style={pn.headline}>{barName}</Text>
      <Text style={[pn.subtitle, { letterSpacing: 2, textTransform: 'uppercase', fontSize: 18 }]}>
        {slide.tagline || ''}
      </Text>
      <View style={pn.divider} />
      {hours.map((h, i) => (
        <View key={i} style={pn.hoursRow}>
          <Text style={pn.hoursLabel}>{h.day || h.label || ''}</Text>
          <Text style={pn.hoursValue}>{h.hours || h.name || ''}</Text>
        </View>
      ))}
    </View>
  );
}

function AnnouncementPanel({ slide }: { slide: SignageSlide }) {
  return (
    <View style={[pn.content, { alignItems: 'center' }]}>
      <Text style={pn.emoji}>{slide.emoji || ''}</Text>
      <Text style={pn.headline}>{slide.headline || ''}</Text>
      <Text style={pn.body}>{slide.message || ''}</Text>
      {slide.subtext ? <Text style={pn.muted}>{slide.subtext}</Text> : null}
    </View>
  );
}

function SportsPanel({ slide }: { slide: SignageSlide }) {
  return (
    <View style={[pn.content, { alignItems: 'center' }]}>
      <Text style={pn.emoji}>{slide.emoji || ''}</Text>
      <Text style={[pn.label, { color: colors.red }]}>{slide.headline || 'Game Day'}</Text>
      <Text style={pn.headline}>{slide.matchup || slide.title || ''}</Text>
      <Text style={pn.subtitle}>{slide.when || ''}</Text>
      <Text style={[pn.body, { color: colors.gold }]}>{slide.promo || slide.message || ''}</Text>
      {slide.tagline ? <Text style={[pn.muted, { fontStyle: 'italic' }]}>{slide.tagline}</Text> : null}
    </View>
  );
}

function CustomPanel({ slide }: { slide: SignageSlide }) {
  return (
    <View style={[pn.content, { alignItems: 'center' }]}>
      <Text style={pn.emoji}>{slide.emoji || ''}</Text>
      <Text style={pn.headline}>{slide.headline || ''}</Text>
      <Text style={pn.body}>{slide.body || slide.message || ''}</Text>
      {(slide.items || []).map((item, i) => (
        <View key={i} style={pn.itemRow}>
          <Text style={pn.itemEmoji}>{item.emoji || ''}</Text>
          <Text style={pn.itemText}>{item.name || item.label || ''}</Text>
        </View>
      ))}
    </View>
  );
}

const pn = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 0,
    paddingVertical: 32,
    paddingHorizontal: 36,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Just position the badge — no extra card. QRBadge (inline) already carries its
  // own card styling, so wrapping it again here made the signage "Join Trivia!"
  // badge a card-in-a-card that didn't match the bare badge used on every other
  // screen. Keep only centering + top margin so it matches in all spots.
  qrFooter: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  label: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  headline: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 44,
    lineHeight: 48,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.6),
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.outfit.regular,
    fontSize: 24,
    color: w(0.7),
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  muted: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.4),
    textAlign: 'center',
    marginTop: 8,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Menu / Specials
  menuItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  menuIcon: { fontSize: 32 },
  menuName: { flex: 1, fontFamily: fonts.outfit.medium, fontSize: 22, color: '#ffffff' },
  menuPrice: { fontFamily: fonts.fredoka.bold, fontSize: 28, color: colors.gold },
  featured: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 28,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  featuredName: { fontFamily: fonts.fredoka.bold, fontSize: 32, color: '#ffffff' },
  featuredPrice: { fontFamily: fonts.fredoka.bold, fontSize: 48, color: colors.gold },
  // Deals
  deal: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 32,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dealValue: { fontFamily: fonts.fredoka.bold, fontSize: 44 },
  dealItem: { fontFamily: fonts.outfit.medium, fontSize: 22, color: w(0.6), marginTop: 4 },
  // Event center (vertically centers content between "Coming Up" label and QR footer)
  eventCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  // Prize list container
  prizeList: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  // Prizes
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  prizeEmoji: { fontSize: 36, marginRight: 12 },
  prizeInfo: { flex: 1 },
  prizePlace: { fontFamily: fonts.outfit.bold, fontSize: 20, color: w(0.8) },
  prizeName: { fontFamily: fonts.outfit.medium, fontSize: 18, color: colors.gold, marginTop: 2 },
  // Hours
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6, paddingHorizontal: 24, marginBottom: 16 },
  hoursLabel: { fontFamily: fonts.outfit.medium, fontSize: 22, color: w(0.5) },
  hoursValue: { fontFamily: fonts.outfit.bold, fontSize: 22, color: colors.gold },
  divider: { width: 60, height: 2, backgroundColor: w(0.2), marginVertical: 16 },
  // Custom items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10,
  },
  itemEmoji: { fontSize: 32, marginRight: 10 },
  itemText: { fontFamily: fonts.outfit.medium, fontSize: 22, color: w(0.7), flex: 1 },
});
