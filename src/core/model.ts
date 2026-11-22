/** Snapshot shapes. Built from the public API, not from another program's tables. */

export interface StatLine {
  name: string
  value: number
}

export interface ItemDef {
  id: number
  className: string
  name: string
  tier: number
  disabled: boolean
  active: boolean
  components: string[]
  stats: StatLine[]
  image: string | null
}

export interface HeroDef {
  id: number
  name: string
  className: string
  bulletGrowth: number
  spiritGrowth: number
  playstyle: string
  signatures: (string | null)[]
  smallImage: string | null
  cardImage: string | null
}

export interface AbilityDef {
  id: number | null
  heroId: number
  slot: number
  className: string | null
  name: string
  spiritPower: boolean
  spiritDuration: boolean
  description: string
  icon: string | null
}

export interface HeroBrawl {
  heroId: number
  wins: number
  losses: number
  matches: number
  items: [number, number, number, number][]
  pairs: [number, number, number, number][]
  versus: Record<string, [number, number, number][]>
  orders: [number[], number, number][]
}

export interface ModeChoice {
  normal: number
  rare: number
}

export interface ModeRound {
  rareWeights: Record<string, number>
  enhancedWeights: Record<string, number>
  choices: ModeChoice[]
}

export interface ModeConfig {
  rerolls: number[]
  abilityPoints: number[]
  souls: number[]
  rounds: ModeRound[]
  tierBuckets: Record<string, { bucket?: { normal?: number; good?: number }; name?: string }>
}

export interface Manifest {
  fetchedAt: number
  minUnix: number
  maxUnix: number
  windowStart: string
  windowEnd: string
  heroCount: number
  itemCount: number
  heroGames: number
  matchesPerHero: Record<string, number>
  source: string
  rareRate: string
  enhancedRate: string
  enhancedStatMultiplier: number
  note: string
}

export interface Catalog {
  heroes: HeroDef[]
  abilities: AbilityDef[]
  items: ItemDef[]
  mode: ModeConfig
  brawl: Map<number, HeroBrawl>
  heroStats: [number, number, number, number][]
  manifest: Manifest
}

export function isDraftable(item: ItemDef): boolean {
  if (item.disabled) return false
  if (item.tier < 1) return false
  if (item.name.startsWith('upgrade_') || item.name.startsWith('Disabled')) return false
  return true
}

export const SOULS: Record<string, number> = {
  BaseAttackDamagePercent: 55,
  BonusFireRate: 60,
  BonusClipSizePercent: 20,
  BulletLifestealPercent: 45,
  BonusBulletSpeedPercent: 8,
  BulletArmorReduction: 45,
  NonPlayerBonusWeaponPower: 12,
  TechPower: 60,
  TechPowerPercent: 50,
  SpiritPower: 60,
  BonusSpirit: 60,
  AbilityLifestealPercentHero: 45,
  CooldownReduction: 70,
  TechRangeMultiplier: 40,
  TechRadiusMultiplier: 30,
  BonusAbilityDurationPercent: 50,
  MagicResistReduction: 45,
  TechPowerReduction: 30,
  BonusHealth: 6,
  BulletResist: 55,
  TechResist: 55,
  OutOfCombatHealthRegen: 30,
  BonusHealthRegen: 60,
  BonusMoveSpeed: 350,
  BonusSprintSpeed: 150,
  Stamina: 250,
  StatusResistancePercent: 25,
  SlowResistancePercent: 15,
  BonusMeleeDamagePercent: 12,
  MeleeResistPercent: 15,
  CombatBarrier: 4,
}

export const WEAPON_STATS = new Set(['WeaponPower', 'BaseAttackDamagePercent'])

export const RARE_RATE = 4 / 27
export const ENHANCED_RATE = 3 / 27
export const ENHANCED_STAT = 1.25

export const INFERNUS_MULTIPLIERS: Record<string, number> = {
  TechPower: 1.6,
  TechPowerPercent: 1.5,
  BonusFireRate: 1.5,
  BulletLifestealPercent: 1.3,
  BonusAbilityDurationPercent: 1.4,
  AbilityLifestealPercentHero: 1.3,
  CooldownReduction: 1.2,
  BonusMoveSpeed: 1.2,
}
