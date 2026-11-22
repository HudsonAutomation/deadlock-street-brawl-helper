#!/usr/bin/env python3
"""Build the offline Street Brawl snapshot from the public Deadlock API.

Window is pinned to the 2026-10-30 patch through 2026-11-03, the same week
named in the specification. Nothing is read from a previous program's tables.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "snapshot"
RAW = OUT / "raw"
IMG = OUT / "images"
MIN_UNIX = 1793318400  # 2026-10-30 00:00:00 UTC
MAX_UNIX = 1793750399  # 2026-11-03 23:59:59 UTC
BASE = "https://api.deadlock-api.com"
REQUIRED_HEROES = {78, 84, 85, 86, 87, 88}
MIN_HERO_MATCHES = 2000
# Stay under the published ~200 requests a minute.
INTERVAL = 0.34

# Bundled public builds. Versions are the ones named in the specification.
BUILDS = [
    # hero_id, build_id, version, role
    (86, 998571, 2, "scarlet"),
    (86, 897240, 19, "oses"),
    (6, 526641, 1, "oses"),
    (77, 353960, 49, "oses"),
    (15, 386845, 3, "oses"),
    (16, 683397, 1, "oses"),
    (81, 814860, 76, "oses"),
    (78, 887853, 1, "oses"),
    (64, 716382, 3, "oses"),
    (76, 546331, 54, "oses"),
    (17, 723432, 5, "oses"),
    (13, 514170, 115, "oses"),
    (14, 360573, 8, "oses"),
    (1, 715046, 10, "oses"),
    (20, 816348, 21, "oses"),
    (4, 749269, 27, "oses"),
    (31, 335499, 110, "oses"),
    (8, 981244, 22, "oses"),
    (63, 832489, 271, "oses"),
    (52, 492664, 99, "oses"),
    (87, 933260, 2, "oses"),
    (67, 406689, 1, "oses"),
    (10, 513995, 1, "oses"),
    (50, 718792, 24, "oses"),
    (84, 841603, 36, "oses"),
    (2, 378177, 68, "oses"),
    (19, 879365, 14, "oses"),
    (80, 589785, 31, "oses"),
    (60, 668231, 7, "oses"),
    (85, 872540, 9, "oses"),
    (69, 323949, 15, "oses"),
    (65, 905815, 138, "oses"),
    (66, 333337, 1, "oses"),
    (3, 881792, 1, "oses"),
    (58, 763021, 1, "oses"),
    (25, 357243, 132, "oses"),
    (7, 341736, 129, "oses"),
    (27, 250970, 31, "oses"),
    (18, 805628, 7, "extra"),
    (35, 793000, 9, "extra"),
    (11, 495688, 1, "extra"),
    (12, 632883, 341, "extra"),
]

PRICED = {
    "BaseAttackDamagePercent",
    "BonusFireRate",
    "BonusClipSizePercent",
    "BulletLifestealPercent",
    "BonusBulletSpeedPercent",
    "BulletArmorReduction",
    "NonPlayerBonusWeaponPower",
    "TechPower",
    "TechPowerPercent",
    "SpiritPower",
    "BonusSpirit",
    "AbilityLifestealPercentHero",
    "CooldownReduction",
    "TechRangeMultiplier",
    "TechRadiusMultiplier",
    "BonusAbilityDurationPercent",
    "MagicResistReduction",
    "TechPowerReduction",
    "BonusHealth",
    "BulletResist",
    "TechResist",
    "OutOfCombatHealthRegen",
    "BonusHealthRegen",
    "BonusMoveSpeed",
    "BonusSprintSpeed",
    "Stamina",
    "StatusResistancePercent",
    "SlowResistancePercent",
    "BonusMeleeDamagePercent",
    "MeleeResistPercent",
    "CombatBarrier",
    "WeaponPower",
}

_last = 0.0


def log(msg: str) -> None:
    print(msg, flush=True)


def throttle() -> None:
    global _last
    wait = INTERVAL - (time.time() - _last)
    if wait > 0:
        time.sleep(wait)
    _last = time.time()


def curl_json(url: str) -> object:
    throttle()
    proc = subprocess.run(
        [
            "curl",
            "-fsS",
            "--retry",
            "4",
            "--retry-delay",
            "2",
            "--retry-all-errors",
            "-H",
            "Accept: application/json",
            "-A",
            "DeadlockItemAssist/1.0 (snapshot)",
            url,
        ],
        check=False,
        capture_output=True,
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace")[-400:]
        raise RuntimeError(f"GET {url} failed: {err}")
    return json.loads(proc.stdout)


def curl_file(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return True
    throttle()
    proc = subprocess.run(
        [
            "curl",
            "-fsS",
            "--retry",
            "3",
            "--retry-delay",
            "1",
            "-A",
            "DeadlockItemAssist/1.0 (snapshot)",
            "-o",
            str(dest),
            url,
        ],
        check=False,
        capture_output=True,
    )
    if proc.returncode != 0 or not dest.exists() or dest.stat().st_size == 0:
        if dest.exists():
            dest.unlink()
        return False
    return True


def num(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    end = 0
    if text[0] in "+-":
        end = 1
    while end < len(text) and (text[end].isdigit() or text[end] == "."):
        end += 1
    if end == 0 or (end == 1 and text[0] in "+-"):
        return None
    try:
        return float(text[:end])
    except ValueError:
        return None


def priced_stats(properties: dict) -> list[dict]:
    out = []
    if not isinstance(properties, dict):
        return out
    for name, prop in properties.items():
        if name not in PRICED or not isinstance(prop, dict):
            continue
        value = num(prop.get("value"))
        if value is None or value == 0:
            continue
        out.append({"name": name, "value": value})
    return out


def scales(prop: dict, token: str) -> bool:
    scale = prop.get("scale_function") if isinstance(prop, dict) else None
    if not isinstance(scale, dict):
        return False
    if scale.get("specific_stat_scale_type") == token:
        return True
    stats = scale.get("scaling_stats") or []
    return token in stats


def ability_flags(item: dict) -> tuple[bool, bool, str]:
    spirit = False
    duration = False
    props = item.get("properties") or {}
    if isinstance(props, dict):
        for prop in props.values():
            if not isinstance(prop, dict):
                continue
            spirit = spirit or scales(prop, "ETechPower")
            duration = duration or scales(prop, "ETechDuration")
    desc = item.get("description")
    text = ""
    if isinstance(desc, dict):
        text = str(desc.get("desc") or "")
    elif isinstance(desc, str):
        text = desc
    return spirit, duration, text


def strip_tags(text: str) -> str:
    out = []
    skip = False
    for ch in text:
        if ch == "<":
            skip = True
            continue
        if ch == ">":
            skip = False
            continue
        if not skip:
            out.append(ch)
    return "".join(out)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    log("heroes")
    heroes_raw = curl_json(f"{BASE}/v1/assets/heroes")
    assert isinstance(heroes_raw, list)
    selected = [
        h
        for h in heroes_raw
        if h.get("player_selectable") and not h.get("disabled")
    ]
    ids = {h["id"] for h in selected}
    missing = REQUIRED_HEROES - ids
    if missing:
        raise SystemExit(f"required heroes missing, refusing to write: {sorted(missing)}")
    if len(selected) < 44:
        raise SystemExit(f"expected at least 44 heroes, got {len(selected)}")

    log("abilities")
    abilities_raw = curl_json(f"{BASE}/v1/assets/items/by-type/ability")
    assert isinstance(abilities_raw, list)
    by_class = {a.get("class_name"): a for a in abilities_raw}

    log("items")
    items_raw = curl_json(f"{BASE}/v1/assets/items/by-type/upgrade")
    assert isinstance(items_raw, list)

    log("mode")
    generic = curl_json(f"{BASE}/v1/assets/generic-data")
    assert isinstance(generic, dict)
    street = generic["street_brawl"]

    log("hero stats")
    hero_stats = curl_json(
        f"{BASE}/v1/analytics/hero-stats?game_mode=street_brawl"
        f"&min_unix_timestamp={MIN_UNIX}&max_unix_timestamp={MAX_UNIX}"
    )
    assert isinstance(hero_stats, list)
    stats_by_id = {row["hero_id"]: row for row in hero_stats}
    low = [
        (hid, stats_by_id.get(hid, {}).get("matches", 0))
        for hid in sorted(ids)
        if stats_by_id.get(hid, {}).get("matches", 0) < MIN_HERO_MATCHES
    ]
    if low:
        raise SystemExit(f"heroes under {MIN_HERO_MATCHES} matches, refusing to write: {low}")

    heroes = []
    abilities = []
    for hero in sorted(selected, key=lambda h: h["name"]):
        upgrades = hero.get("standard_level_up_upgrades") or {}
        items_map = hero.get("items") or {}
        sigs = [items_map.get(f"signature{n}") for n in (1, 2, 3, 4)]
        images = hero.get("images") or {}
        small = images.get("icon_image_small_webp") or images.get("icon_image_small")
        card = images.get("icon_hero_card_webp") or images.get("icon_hero_card")
        hero_out = {
            "id": hero["id"],
            "name": hero["name"],
            "className": hero.get("class_name"),
            "bulletGrowth": float(upgrades.get("MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL") or 0),
            "spiritGrowth": float(upgrades.get("MODIFIER_VALUE_TECH_POWER") or 0),
            "playstyle": strip_tags(str((hero.get("description") or {}).get("playstyle") or "")),
            "signatures": sigs,
            "smallImage": f"heroes/{hero['id']}-small.webp" if small else None,
            "cardImage": f"heroes/{hero['id']}-card.webp" if card else None,
        }
        heroes.append(hero_out)
        for slot, class_name in enumerate(sigs):
            src = by_class.get(class_name) or {}
            spirit, duration, desc = ability_flags(src) if src else (False, False, "")
            icon = src.get("image_webp") or src.get("image")
            abilities.append(
                {
                    "id": src.get("id"),
                    "heroId": hero["id"],
                    "slot": slot,
                    "className": class_name,
                    "name": src.get("name") or class_name or f"Ability {slot + 1}",
                    "spiritPower": spirit,
                    "spiritDuration": duration,
                    "description": strip_tags(desc)[:2000],
                    "icon": f"abilities/{hero['id']}-{slot}.webp" if icon else None,
                    "iconUrl": icon,
                }
            )
            if icon:
                curl_file(icon, IMG / f"abilities/{hero['id']}-{slot}.webp")
        if small:
            curl_file(small, IMG / f"heroes/{hero['id']}-small.webp")
        if card:
            curl_file(card, IMG / f"heroes/{hero['id']}-card.webp")

    items = []
    for item in items_raw:
        tier = int(item.get("item_tier") or 0)
        icon = item.get("shop_image_webp") or item.get("image_webp")
        items.append(
            {
                "id": item["id"],
                "className": item.get("class_name"),
                "name": item.get("name"),
                "tier": tier,
                "disabled": bool(item.get("disabled")),
                "active": bool(item.get("is_active_item")),
                "components": list(item.get("component_items") or []),
                "stats": priced_stats(item.get("properties") or {}),
                "image": f"items/{item['id']}.webp" if icon else None,
            }
        )
        if icon and not item.get("disabled") and tier >= 1:
            name = item.get("name") or ""
            if not name.startswith("upgrade_") and not name.startswith("Disabled"):
                curl_file(icon, IMG / f"items/{item['id']}.webp")

    rounds = []
    for block in street["item_draft_rounds_per_game_round"]:
        rounds.append(
            {
                "rareWeights": block.get("chance_rare", {}).get("outcomes_to_weights", {}),
                "enhancedWeights": block.get("chance_enhanced", {}).get("outcomes_to_weights", {}),
                "choices": [
                    {
                        "normal": choice["normal_mod_tier"],
                        "rare": choice["rare_mod_tier"],
                    }
                    for choice in block["item_draft_rounds"]
                ],
            }
        )
    mode = {
        "rerolls": street["item_draft_rerolls_per_round"],
        "abilityPoints": street["apper_round"],
        "souls": street["gold_per_round"],
        "rounds": rounds,
        "tierBuckets": street.get("item_drafts", {}),
    }

    brawl_dir = OUT / "brawl"
    brawl_dir.mkdir(parents=True, exist_ok=True)
    hero_ids = sorted(ids)
    for index, hid in enumerate(hero_ids):
        dest = brawl_dir / f"{hid}.json"
        if dest.exists():
            log(f"brawl {hid} cached ({index + 1}/{len(hero_ids)})")
            continue
        log(f"brawl {hid} ({index + 1}/{len(hero_ids)})")
        q = (
            f"hero_id={hid}&game_mode=street_brawl"
            f"&min_unix_timestamp={MIN_UNIX}&max_unix_timestamp={MAX_UNIX}"
        )
        item_rows = curl_json(f"{BASE}/v1/analytics/item-stats?{q}")
        pairs = curl_json(
            f"{BASE}/v1/analytics/item-permutation-stats?{q}&combination_size=2"
        )
        orders = curl_json(
            f"{BASE}/v1/analytics/ability-order-stats?{q}&min_matches=5"
        )
        assert isinstance(item_rows, list) and isinstance(pairs, list) and isinstance(orders, list)
        pairs = [p for p in pairs if p.get("matches", 0) >= 20]
        pairs.sort(key=lambda p: p.get("matches", 0), reverse=True)
        pairs = pairs[:600]
        orders.sort(key=lambda p: p.get("matches", 0), reverse=True)
        orders = orders[:200]
        versus: dict[str, list] = {}
        for enemy in hero_ids:
            if enemy == hid:
                continue
            rows = curl_json(
                f"{BASE}/v1/analytics/item-stats?{q}&enemy_hero_ids={enemy}&min_matches=50"
            )
            assert isinstance(rows, list)
            kept = [
                [row["item_id"], row["wins"], row["matches"]]
                for row in rows
                if row.get("matches", 0) >= 50
            ]
            if kept:
                versus[str(enemy)] = kept
        stat = stats_by_id[hid]
        payload = {
            "heroId": hid,
            "wins": stat["wins"],
            "losses": stat["losses"],
            "matches": stat["matches"],
            "items": [
                [row["item_id"], row["wins"], row["losses"], row["matches"]]
                for row in item_rows
            ],
            "pairs": [
                [p["item_ids"][0], p["item_ids"][1], p["wins"], p["matches"]]
                for p in pairs
            ],
            "versus": versus,
            "orders": [
                [o["abilities"], o["wins"], o["matches"]] for o in orders
            ],
        }
        dest.write_text(json.dumps(payload, separators=(",", ":")))
        log(f"  items {len(payload['items'])} pairs {len(payload['pairs'])} versus {len(versus)} orders {len(payload['orders'])}")

    log("builds")
    builds = []
    for hero_id, build_id, version, role in BUILDS:
        url = f"{BASE}/v1/builds?build_id={build_id}&version={version}"
        body = curl_json(url)
        assert isinstance(body, list) and body, f"missing build {build_id} v{version}"
        hb = body[0]["hero_build"]
        builds.append({"role": role, "expectedHeroId": hero_id, "heroBuild": hb})
        log(f"  {build_id} v{version} hero {hb.get('hero_id')} {hb.get('name')}")

    fetched_at = int(time.time())
    hero_games = sum(stats_by_id[hid]["matches"] for hid in hero_ids)
    manifest = {
        "fetchedAt": fetched_at,
        "minUnix": MIN_UNIX,
        "maxUnix": MAX_UNIX,
        "windowStart": "2026-10-30",
        "windowEnd": "2026-11-03",
        "heroCount": len(heroes),
        "itemCount": len(items),
        "heroGames": hero_games,
        "matchesPerHero": {str(hid): stats_by_id[hid]["matches"] for hid in hero_ids},
        "source": "https://api.deadlock-api.com",
        "rareRate": "4/27",
        "enhancedRate": "3/27",
        "enhancedStatMultiplier": 1.25,
        "note": "Rare and enhanced rates are the specification's fixture counts, not a new measurement. Enhanced numbers are the 1.25 assumption.",
    }
    # Write the catalog only after every required hero file exists.
    for hid in REQUIRED_HEROES:
        if not (brawl_dir / f"{hid}.json").exists():
            raise SystemExit(f"refusing to publish, missing brawl file {hid}")
    (OUT / "heroes.json").write_text(json.dumps(heroes, separators=(",", ":")))
    (OUT / "abilities.json").write_text(json.dumps(abilities, separators=(",", ":")))
    (OUT / "items.json").write_text(json.dumps(items, separators=(",", ":")))
    (OUT / "mode.json").write_text(json.dumps(mode, separators=(",", ":")))
    (OUT / "builds.json").write_text(json.dumps(builds))
    (OUT / "hero-stats.json").write_text(
        json.dumps(
            [
                [hid, stats_by_id[hid]["wins"], stats_by_id[hid]["losses"], stats_by_id[hid]["matches"]]
                for hid in hero_ids
            ],
            separators=(",", ":"),
        )
    )
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    log(f"wrote snapshot heroes={len(heroes)} items={len(items)} heroGames={hero_games}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        log(f"FETCH FAILED: {exc}")
        sys.exit(1)
