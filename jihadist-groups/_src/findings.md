# Jihadist Groups: Who's Who, final findings (v1)
Prepared 28 Oct 2026 (America/New_York). Incident window: 28 Sep to 28 Oct 2026. Page: https://beacon-tools.onrender.com/jihadist-groups/

## Counts
52 records: 45 counted groups (al-Qaeda network 10, Islamic State network 17, Iran-backed axis 9, independent and nationalist 9) and 7 records not counted: five dissolved or dormant (Jemaah Islamiyah, East Indonesia Mujahideen, Abu Sayyaf, Hurras al-Din and Islamic State Sinai, shown in amber) and two umbrellas (Islamic Resistance in Iraq and Dawlah Islamiyah). 32 countries. 12 counted groups are based in Africa. 21 incidents in the 30-day window (12 in Africa). 66 links, including four outside actors (Iran, Azawad Liberation Front, Syrian government, Yemen government and Saudi coalition). 111 numbered sources, none returning 404 or 410.

## Owner decisions applied
1. Taliban and HTS included and marked "now governing".
2. Family renamed "Iran-backed axis", Hamas and PIJ kept inside it.
3. JAD, Maute and BIFF moved into the Islamic State network.
4. Mozambique and Somalia strength shown as two estimates, each with its source.
5. Dissolved or dormant groups use grey (DISSOLVED_COLOR = #9aa6b8), set in one variable in `_src/build_data.py`, and every element drawn in it carries data-status="defunct" as the shared check requires.
6. Iran and the Azawad Liberation Front shown as outside nodes on the link graph.

## Main finding
Africa is the centre of gravity. Africa Center for Strategic Studies counts 23,872 deaths linked to militant Islamist groups in Africa in the 12 months to mid-2026: Sahel 9,928 (42%), Lake Chad Basin 6,643 (28%), Somalia about 6,700 (28%, derived from the stated share), Mozambique 539 (2%), North Africa 31.

## Leadership changes in the last 24 months (top leaders)
Hamas (new leader 20 Jul 2026), BIFF Bungos faction (leader killed 5 Jul 2026), Maute group (leader killed 17 Apr 2026), Ansaru (emir and deputy arrested 31 Jul 2025), Jaish al-Adl coalition (founder-leader killed 5 Nov 2024), Hezbollah (new leader 29 Oct 2024).

## Contested items (shown on the cards with confidence and reason)
Islamic State Mozambique strength (UN 400-500, Africa Center 250-300); Islamic State Somalia strength (UN 150-250, Somali experts 500-600); Ittehad-ul-Mujahideen Pakistan leadership (UN says al-Qaeda in the Indian Subcontinent formed its backbone, Indian and US press say the Hafiz Gul Bahadur group leads it); al-Qaeda core leader (no formal succession announced); The Resistance Front leader.

## Claims dropped as unverified
The Global Terrorism Index claim that the Sahel has more than half of world terrorism deaths, and the "Iran war since 28 February 2026" framing. Neither could be confirmed from a source opened in this build.

## Not covered
Ajnad Bayt al-Maqdis, Ansar al-Tawhid, Hizbul Mujahideen, Central Asian groups, Lebanese Sunni groups, other Palestinian factions, Afghan and Pakistani Shia brigades.

## Files
`groups.json`, `relations.json`, `incidents.json`, `momentum.json`, `images.json`, `url_check.json` (phase 1 research, as first delivered) and `data.json` (the final page data) in this folder; `findings_phase1.md` is the phase 1 write-up.
