export const CARD_COVERAGE_STATUSES = Object.freeze([
  "goatVanilla",
  "goatTemplate",
  "goatCustom",
  "goatForbiddenButScripted",
  "goatDeckBlocked",
  "goatUnsupported",
  "notInGoatPool",
] as const);

export type CardCoverageStatus = (typeof CARD_COVERAGE_STATUSES)[number];

export const CARD_COVERAGE_MANIFEST = Object.freeze({
  "00032864": "goatVanilla", // The 13th Grave
  "00062121": "goatUnsupported", // Castle of Dark Illusions
  "00102380": "goatUnsupported", // Lava Golem
  "00126218": "goatUnsupported", // Skull Dice
  "00218704": "goatUnsupported", // Fenrir
  "00242146": "goatUnsupported", // Ballista of Rampart Smashing
  "00295517": "goatUnsupported", // A Legendary Ocean
  "00296499": "goatUnsupported", // The Regulation of Tribe
  "00303660": "goatUnsupported", // Amplifier
  "00403847": "goatUnsupported", // The A. Forces
  "00423705": "goatUnsupported", // Gearfried the Iron Knight
  "00425934": "goatUnsupported", // Goblin of Greed
  "00473469": "goatUnsupported", // Driving Snow
  "00549481": "goatVanilla", // Prevent Rat
  "00596051": "goatUnsupported", // Snake Fang
  "00759393": "goatUnsupported", // Hiita the Fire Charmer
  "00967928": "goatUnsupported", // Penalty Game!
  "00980973": "goatUnsupported", // Armed Dragon LV3
  "01082946": "goatUnsupported", // Pyro Clock of Destiny
  "01102515": "goatUnsupported", // Dark Mimic LV3
  "01184620": "goatVanilla", // Kojikocy
  "01248895": "goatUnsupported", // Chain Destruction
  "01347977": "goatUnsupported", // Mysterious Guard
  "01412158": "goatDeckBlocked", // Super Roboyarou
  "01434352": "goatUnsupported", // Chaos Necromancer
  "01435851": "goatUnsupported", // Dragon Treasure
  "01525329": "goatUnsupported", // The Hunter with 7 Weapons
  "01557499": "goatUnsupported", // Silver Bow and Arrow
  "01571945": "goatUnsupported", // White Ninja
  "01641882": "goatDeckBlocked", // Fusionist
  "01669772": "goatUnsupported", // Spell Purification
  "01689516": "goatUnsupported", // The Big March of Animals
  "01761063": "goatVanilla", // Nekogal #1
  "01781310": "goatUnsupported", // Fuh-Rin-Ka-Zan
  "01784619": "goatVanilla", // Uraby
  "01801154": "goatUnsupported", // Centrifugal Field
  "01804528": "goatUnsupported", // Dark Coffin
  "01918087": "goatUnsupported", // Minor Goblin Official
  "01965724": "goatUnsupported", // Mokey Mokey Smackdown
  "01995985": "goatUnsupported", // Silent Swordsman LV3
  "02111707": "goatDeckBlocked", // XY-Dragon Cannon
  "02118022": "goatVanilla", // Hyosube
  "02130625": "goatUnsupported", // Numinous Healer
  "02134346": "goatUnsupported", // Asura Priest
  "02204140": "goatUnsupported", // Book of Life
  "02311603": "goatVanilla", // Overdrive
  "02314238": "goatUnsupported", // Dark Magic Attack
  "02326738": "goatUnsupported", // Des Lacooda
  "02356994": "goatUnsupported", // Great Long Nose
  "02370081": "goatUnsupported", // Steel Shell
  "02460565": "goatUnsupported", // Marauding Captain
  "02468169": "goatVanilla", // Sealmaster Meisei
  "02483611": "goatVanilla", // Water Omotics
  "02504891": "goatDeckBlocked", // Skull Knight
  "02671330": "goatUnsupported", // Hyper Hammerhead
  "02694423": "goatUnsupported", // Medusa Worm
  "02792265": "goatUnsupported", // Servant of Catabolism
  "02833249": "goatUnsupported", // D. Tribe
  "02851070": "goatCustom", // Reflect Bounder
  "02863439": "goatVanilla", // Fiend Reflection #2
  "02903036": "goatUnsupported", // Tribute Doll
  "02926176": "goatUnsupported", // Curse of Royal
  "02964201": "goatVanilla", // Ryu-Ran
  "03027001": "goatUnsupported", // Fake Trap
  "03055837": "goatUnsupported", // Trap of Board Eraser
  "03056267": "goatUnsupported", // Invader of the Throne
  "03078576": "notInGoatPool", // Yata-Garasu
  "03134241": "goatVanilla", // Flying Kamakiri #2
  "03136426": "goatUnsupported", // Level Limit - Area B
  "03149764": "goatUnsupported", // Tutan Mask
  "03170832": "goatVanilla", // Takuhee
  "03493978": "goatUnsupported", // Don Turtle
  "03510565": "goatUnsupported", // Stealth Bird
  "03549275": "goatUnsupported", // Dice Jar
  "03573512": "goatVanilla", // Swordsman of Landstar
  "03627449": "goatUnsupported", // Skull Guardian
  "03643300": "goatUnsupported", // The Legendary Fisherman
  "03682106": "goatUnsupported", // Double Snare
  "03773196": "goatUnsupported", // D.D. Scout Plane
  "03797883": "goatVanilla", // Slot Machine
  "03810071": "goatUnsupported", // Monk Fighter
  "03819470": "goatUnsupported", // Seven Tools of the Bandit
  "04031928": "notInGoatPool", // Change of Heart
  "04035199": "goatVanilla", // Shapesnatch
  "04041838": "goatUnsupported", // Ninja Grandmaster Sasuke
  "04042268": "goatVanilla", // Island Turtle
  "04081094": "goatUnsupported", // The Second Sarcophagus
  "04149689": "goatUnsupported", // Goblin Fan
  "04178474": "goatUnsupported", // Raigeki Break
  "04179849": "goatVanilla", // Queen of Autumn Leaves
  "04206964": "goatUnsupported", // Trap Hole
  "04259068": "goatUnsupported", // Spell Economics
  "04266839": "goatUnsupported", // Kiseitai
  "04335645": "goatUnsupported", // Newdoria
  "04542651": "goatUnsupported", // Yellow Luster Shield
  "04614116": "goatUnsupported", // Dark Energy
  "04732017": "goatUnsupported", // Molten Zombie
  "04849037": "goatUnsupported", // Performance of Sword
  "04861205": "goatUnsupported", // Call of the Mummy
  "04869446": "goatUnsupported", // Judgment of the Desert
  "04896788": "goatUnsupported", // Spirit of the Pot of Greed
  "04920010": "goatVanilla", // Souls of the Forgotten
  "04929256": "goatUnsupported", // Mobius the Frost Monarch
  "05053103": "goatVanilla", // Battle Ox
  "05257687": "goatUnsupported", // Jowls of Dark Demise
  "05265750": "goatVanilla", // Skull Mariner
  "05318639": "goatTemplate", // Mystical Space Typhoon
  "05371656": "goatUnsupported", // Sword of the Soul-Eater
  "05388481": "goatVanilla", // Darkfire Soldier #1
  "05405694": "goatUnsupported", // Black Luster Soldier
  "05434080": "goatVanilla", // Headless Knight
  "05464695": "goatVanilla", // Blazing Inpachi
  "05494820": "goatUnsupported", // Cyclon Laser
  "05556668": "goatUnsupported", // Exchange
  "05600127": "goatDeckBlocked", // Humanoid Worm Drake
  "05616412": "goatUnsupported", // Destruction Punch
  "05628232": "goatVanilla", // Flying Penguin
  "05703682": "goatUnsupported", // Thousand Energy
  "05758500": "goatUnsupported", // Soul Release
  "05818798": "goatVanilla", // Gazelle the King of Mythical Beasts
  "05901497": "goatUnsupported", // Queen's Double
  "05990062": "goatUnsupported", // Reversal Quiz
  "06103294": "goatUnsupported", // Emissary of the Oasis
  "06104968": "goatUnsupported", // Bubonic Vermin
  "06133894": "goatUnsupported", // Mazera DeVille
  "06285791": "goatUnsupported", // The Wicked Worm Beast
  "06297941": "goatVanilla", // Burglar
  "06343408": "goatUnsupported", // Miracle Dig
  "06368038": "goatVanilla", // Gaia The Fierce Knight
  "06390406": "goatUnsupported", // Emblem of Dragon Destroyer
  "06733059": "goatUnsupported", // Skull Lair
  "06740720": "goatVanilla", // Seiyaryu
  "06850209": "goatUnsupported", // A Deal with Dark Ruler
  "06967870": "goatUnsupported", // Dark Scorpion - Cliff the Trap Remover
  "06979239": "goatUnsupported", // Woodland Sprite
  "07019529": "goatUnsupported", // Insect Soldiers of the Sky
  "07089711": "goatUnsupported", // Hane-Hane
  "07165085": "goatUnsupported", // Bait Doll
  "07180418": "goatUnsupported", // Armor Exe
  "07359741": "goatVanilla", // Mechanicalchaser
  "07369217": "goatUnsupported", // Metallizing Parasite - Lunatite
  "07489323": "goatUnsupported", // Milus Radiant
  "07512044": "goatUnsupported", // Gather Your Mind
  "07562372": "goatVanilla", // Megasonic Eye
  "07565547": "goatUnsupported", // Collected Power
  "07572887": "goatCustom", // D.D. Warrior Lady
  "07625614": "goatUnsupported", // Raregold Armor
  "07802006": "goatUnsupported", // Magical Plant Mandragola
  "07805359": "goatVanilla", // Niwatori
  "07892180": "goatVanilla", // Psychic Kappa
  "07902349": "goatVanilla", // Left Arm of the Forbidden One
  "08034697": "goatUnsupported", // Magical Marionette
  "08124921": "goatVanilla", // Right Leg of the Forbidden One
  "08131171": "goatCustom", // Sinister Serpent
  "08201910": "goatUnsupported", // Star Boy
  "08251996": "goatUnsupported", // Ojama Delta Hurricane!!
  "08471389": "goatVanilla", // Giga-Tech Wolf
  "08508055": "goatVanilla", // Chu-Ske the Mouse Fighter
  "08581705": "goatUnsupported", // Infernalqueen Archfiend
  "08628798": "goatUnsupported", // D.D. Dynamite
  "08634636": "goatUnsupported", // Dark Cat with White Tail
  "08687195": "goatUnsupported", // Dreamsprite
  "08715625": "goatVanilla", // Bokoichi the Freightening Car
  "08794435": "goatUnsupported", // Maju Garzett
  "08842266": "goatUnsupported", // Poison of the Old Man
  "08951260": "goatUnsupported", // Respect Play
  "08964854": "goatUnsupported", // Combination Attack
  "09074847": "goatUnsupported", // Major Riot
  "09076207": "goatUnsupported", // Armed Ninja
  "09156135": "goatUnsupported", // Apprentice Magician
  "09159938": "goatVanilla", // Dark Gray
  "09264485": "goatUnsupported", // Horus' Servant
  "09293977": "goatDeckBlocked", // Metal Dragon
  "09373534": "goatUnsupported", // Fuhma Shuriken
  "09596126": "goatUnsupported", // Chaos Sorcerer
  "09603356": "goatUnsupported", // Shadowknight Archfiend
  "09633505": "goatUnsupported", // Guardian Kay'est
  "09637706": "goatUnsupported", // Des Wombat
  "09653271": "goatDeckBlocked", // Kaminari Attack
  "09744376": "goatUnsupported", // Good Goblin Housekeeping
  "09786492": "goatUnsupported", // White Dragon Ritual
  "09817927": "goatUnsupported", // Gyaku-Gire Panda
  "10012614": "goatUnsupported", // Banner of Courage
  "10035717": "goatUnsupported", // Weapon Change
  "10069180": "goatUnsupported", // Spell-Stopping Statute
  "10071456": "goatVanilla", // Protector of the Throne
  "10189126": "goatUnsupported", // Masked Sorcerer
  "10202894": "goatVanilla", // Skull Red Bird
  "10209545": "goatUnsupported", // Decayed Commander
  "10248192": "goatUnsupported", // Hieroglyph Lithograph
  "10262698": "goatVanilla", // The Statue of Easter Island
  "10352095": "goatUnsupported", // Scroll of Bewitchment
  "10375182": "goatUnsupported", // Command Knight
  "10485110": "goatUnsupported", // Ocean Dragon Lord - Neo-Daedalus
  "10509340": "goatUnsupported", // Ancient Gear Beast
  "10538007": "goatVanilla", // Leogun
  "10755153": "goatUnsupported", // Guardian Ceal
  "10809984": "goatUnsupported", // Great Phantom Thief
  "10979723": "goatUnsupported", // Amazoness Tiger
  "10992251": "goatVanilla", // Gradius
  "11021521": "goatUnsupported", // Neko Mane King
  "11091375": "goatVanilla", // Luster Dragon
  "11224103": "goatUnsupported", // Horus the Black Flame Dragon LV6
  "11321183": "goatVanilla", // Dark Blade
  "11324436": "goatUnsupported", // Electric Snake
  "11384280": "goatUnsupported", // Cannon Soldier
  "11448373": "goatUnsupported", // Grave Protector
  "11548522": "goatUnsupported", // Outstanding Dog Marron
  "11549357": "goatVanilla", // Gamma the Magnet Warrior
  "11743119": "goatUnsupported", // Union Rider
  "11760174": "goatUnsupported", // Sasuke Samurai #2
  "11761845": "goatVanilla", // Beast of Talwar
  "11813953": "goatVanilla", // Great Angus
  "11868825": "goatUnsupported", // Goblin's Secret Remedy
  "11901678": "goatDeckBlocked", // Black Skull Dragon
  "11961740": "goatUnsupported", // Different Dimension Capsule
  "11987744": "goatVanilla", // Nin-Ken Dog
  "12057781": "goatVanilla", // Goblin Calligrapher
  "12143771": "goatVanilla", // People Running About
  "12160911": "goatUnsupported", // Elephant Statue of Disaster
  "12181376": "goatUnsupported", // Triangle Ecstasy Spark
  "12183332": "goatUnsupported", // Card Shuffle
  "12206212": "goatUnsupported", // Harpie Lady Sisters
  "12253117": "goatUnsupported", // World Suppression
  "12470447": "goatUnsupported", // Curse of Fiend
  "12472242": "goatUnsupported", // Leghul
  "12482652": "goatVanilla", // Ojama Green
  "12503902": "goatUnsupported", // Rare Metalmorph
  "12580477": "notInGoatPool", // Raigeki
  "12600382": "goatUnsupported", // Exodia Necross
  "12607053": "goatUnsupported", // Waboku
  "12800777": "goatUnsupported", // Garuda the Wind Spirit
  "12883044": "goatVanilla", // Flame Dancer
  "12923641": "goatUnsupported", // Swords of Concealing Light
  "12953226": "goatUnsupported", // Nuvia the Wicked
  "12965761": "goatUnsupported", // Des Dendle
  "13026402": "goatUnsupported", // A-Team: Trap Disposal Unit
  "13039848": "goatVanilla", // Giant Soldier of Stone
  "13179332": "goatVanilla", // Charcoal Inpachi
  "13215230": "goatUnsupported", // Dream Clown
  "13386503": "goatUnsupported", // Ghost Knight of Jackal
  "13409151": "goatUnsupported", // Desertapir
  "13429800": "goatVanilla", // Great White
  "13522325": "goatUnsupported", // Spirit of Flames
  "13532663": "goatUnsupported", // Dummy Golem
  "13599884": "goatUnsupported", // Steel Scorpion
  "13604200": "goatUnsupported", // Sage's Stone
  "13626450": "goatUnsupported", // Malice Dispersion
  "13676474": "goatVanilla", // Grand Tiki Elder
  "13722870": "goatDeckBlocked", // Dark Flare Knight
  "13723605": "goatVanilla", // Man-Eating Treasure Chest
  "13756293": "goatDeckBlocked", // King Dragun
  "13803864": "goatDeckBlocked", // Mokey Mokey King
  "13944422": "goatUnsupported", // Granadora
  "13945283": "goatUnsupported", // Wall of Illusion
  "14015067": "goatVanilla", // Ancient One of the Deep Forest
  "14037717": "goatVanilla", // Spirit of the Books
  "14087893": "goatTemplate", // Book of Moon
  "14141448": "goatUnsupported", // Great Moth
  "14148099": "goatUnsupported", // B.E.S. Big Core
  "14261867": "goatUnsupported", // 8-Claws Scorpion
  "14291024": "goatUnsupported", // Gradius' Option
  "14315573": "goatUnsupported", // Negate Attack
  "14318794": "goatUnsupported", // Life Absorbing Machine
  "14391920": "goatUnsupported", // Inferno Tempest
  "14531242": "goatVanilla", // Opticlops
  "14618326": "goatUnsupported", // Crimson Ninja
  "14644902": "goatUnsupported", // Summoner of Illusions
  "14851496": "goatVanilla", // Jellyfish
  "14878871": "goatUnsupported", // Rescue Cat
  "14977074": "goatVanilla", // Garoozis
  "15013468": "goatUnsupported", // Andro Sphinx
  "15023985": "goatVanilla", // Stone Ogre Grotto
  "15025844": "goatVanilla", // Mystical Elf
  "15052462": "goatUnsupported", // Violet Crystal
  "15083728": "goatUnsupported", // House of Adhesive Tape
  "15090429": "goatUnsupported", // Whirlwind Prodigy
  "15150365": "goatUnsupported", // White Magical Hat
  "15237615": "goatDeckBlocked", // Empress Judge
  "15259703": "goatUnsupported", // Toon World
  "15270885": "goatUnsupported", // Toon Goblin Attack Force
  "15303296": "goatVanilla", // Ryu-Kishin
  "15383415": "goatUnsupported", // Swarm of Scarabs
  "15401633": "goatVanilla", // Kagemusha of the Blue Flame
  "15480588": "goatVanilla", // Armored Lizard
  "15653824": "goatUnsupported", // Skull Knight #2
  "15717011": "goatUnsupported", // The Light - Hex-Sealed Fusion
  "15734813": "goatVanilla", // Soul Tiger
  "15800838": "goatUnsupported", // Mind Crush
  "15866454": "goatUnsupported", // Spiritualism
  "15960641": "goatUnsupported", // Mirage Dragon
  "16135253": "goatUnsupported", // Agido
  "16222645": "goatUnsupported", // Sasuke Samurai
  "16226786": "goatUnsupported", // Night Assailant
  "16227556": "goatUnsupported", // Inspection
  "16255442": "goatUnsupported", // Beckoning Light
  "16268841": "goatUnsupported", // Zolga
  "16353197": "goatVanilla", // Drooling Lizard
  "16392422": "goatUnsupported", // Toon Masked Sorcerer
  "16430187": "goatUnsupported", // The Reliable Guardian
  "16435215": "goatUnsupported", // Dragged Down into the Grave
  "16469012": "goatUnsupported", // Teva
  "16475472": "goatUnsupported", // Lesser Fiend
  "16509093": "goatUnsupported", // Royal Keeper
  "16556849": "goatUnsupported", // Freed the Brave Wanderer
  "16587243": "goatVanilla", // Neo Bug
  "16589042": "goatUnsupported", // Swift Gaia the Fierce Knight
  "16762927": "goatUnsupported", // Gravekeeper's Servant
  "16768387": "goatUnsupported", // Big Eye
  "16899564": "goatVanilla", // Beautiful Headhuntress
  "16956455": "goatUnsupported", // Chiron the Mage
  "16970158": "goatUnsupported", // Call of the Grave
  "16972957": "goatVanilla", // Doma The Angel of Silence
  "17078030": "goatUnsupported", // Wall of Revealing Light
  "17092736": "goatUnsupported", // Ancient Telescope
  "17185260": "goatUnsupported", // Inferno Hammer
  "17192817": "goatVanilla", // Molten Behemoth
  "17214465": "goatUnsupported", // Maiden of the Aqua
  "17358176": "goatVanilla", // Lady of Faith
  "17375316": "notInGoatPool", // Confiscation
  "17444133": "goatUnsupported", // Kaiser Sea Horse
  "17449108": "goatUnsupported", // Nobleman of Extermination
  "17535588": "goatVanilla", // Armored Starfish
  "17597059": "goatUnsupported", // Byser Shock
  "17653779": "goatUnsupported", // Fairy's Hand Mirror
  "17655904": "goatUnsupported", // Burst Stream of Destruction
  "17658803": "goatVanilla", // Luster Dragon #2
  "17814387": "goatUnsupported", // Reinforcements
  "17881964": "goatDeckBlocked", // Darkfire Dragon
  "17985575": "goatUnsupported", // Lord of D.
  "18036057": "goatUnsupported", // Airknight Parshath
  "18144506": "notInGoatPool", // Harpie's Feather Duster
  "18161786": "goatUnsupported", // Mystic Plasma Zone
  "18190572": "goatUnsupported", // Micro Ray
  "18246479": "goatVanilla", // Battle Steer
  "18318842": "goatUnsupported", // Abyss Soldier
  "18378582": "goatUnsupported", // Archlord Zerato
  "18590133": "goatUnsupported", // Goblin King
  "18591904": "goatUnsupported", // Final Destiny
  "18605135": "goatUnsupported", // Tornado Wall
  "18654201": "goatUnsupported", // Criosphinx
  "18710707": "goatVanilla", // The Furious Sea King
  "18807108": "goatUnsupported", // Spellbinding Circle
  "18891691": "goatUnsupported", // Perfect Machine King
  "18937875": "goatUnsupported", // Burning Spear
  "19066538": "goatDeckBlocked", // Roaring Ocean Snake
  "19086954": "goatUnsupported", // Second Goblin
  "19153634": "goatUnsupported", // Patrician of Darkness
  "19159413": "goatUnsupported", // De-Spell
  "19230407": "goatUnsupported", // Offerings to the Doomed
  "19252988": "goatUnsupported", // Trap Jammer
  "19312169": "goatUnsupported", // Talisman of Trap Sealing
  "19384334": "goatUnsupported", // Molten Destruction
  "19406822": "goatUnsupported", // Kotodama
  "19523799": "goatUnsupported", // Ookazi
  "19612721": "goatUnsupported", // Disc Fighter
  "19613556": "goatTemplate", // Heavy Storm
  "19827717": "goatUnsupported", // Return of the Doomed
  "19847532": "goatUnsupported", // Infernal Flame Emperor
  "19877898": "goatUnsupported", // Ultimate Insect LV7
  "20060230": "goatVanilla", // Hard Armor
  "20065549": "goatUnsupported", // Non-Spellcasting Area
  "20188127": "goatUnsupported", // Fairy of the Spring
  "20228463": "goatUnsupported", // Ceremonial Bell
  "20277860": "goatVanilla", // Armored Zombie
  "20374520": "goatUnsupported", // Begone, Knave!
  "20394040": "goatUnsupported", // Lava Battleguard
  "20436034": "goatUnsupported", // Ring of Magnetism
  "20522190": "goatUnsupported", // Dark Mirror Force
  "20624263": "goatVanilla", // Peacock
  "20644748": "goatUnsupported", // Spatial Collapse
  "20721928": "goatVanilla", // Elemental HERO Sparkman
  "20727787": "goatUnsupported", // Disarmament
  "20765952": "goatUnsupported", // Mask of Dispel
  "20781762": "goatUnsupported", // Rock Bombardment
  "20831168": "goatVanilla", // Lizard Soldier
  "20858318": "goatUnsupported", // Dark Scorpion Combination
  "20871001": "goatUnsupported", // Blue Medicine
  "20939559": "goatUnsupported", // Shadowslayer
  "21015833": "goatUnsupported", // Hayabusa Knight
  "21051146": "goatUnsupported", // Blast Magician
  "21070956": "goatUnsupported", // Altar for Tribute
  "21175632": "goatDeckBlocked", // St. Joan
  "21219755": "goatUnsupported", // Destruction Ring
  "21237481": "goatUnsupported", // Type Zero Magic Crusher
  "21263083": "goatVanilla", // Pale Beast
  "21297224": "goatUnsupported", // Hysteric Fairy
  "21323861": "goatUnsupported", // Acid Rain
  "21340051": "goatUnsupported", // Boar Soldier
  "21347810": "goatUnsupported", // Rainbow Flower
  "21417692": "goatUnsupported", // Dark Elf
  "21466326": "goatUnsupported", // Blasting the Ruins
  "21558682": "goatUnsupported", // Jam Defender
  "21593977": "notInGoatPool", // Makyura the Destructor
  "21597117": "goatUnsupported", // A Hero Emerges
  "21598948": "goatUnsupported", // Fairy Box
  "21770260": "goatUnsupported", // Jam Breeding Machine
  "21817254": "goatVanilla", // Mega Thunderball
  "21840375": "goatUnsupported", // Hidden Spellbook
  "21844576": "goatVanilla", // Elemental HERO Avian
  "21887179": "goatUnsupported", // Getsu Fuhma
  "21888494": "goatUnsupported", // Chosen One
  "21900719": "goatUnsupported", // Twin Swords of Flashing Light - Tryce
  "21908319": "goatUnsupported", // Kozaky's Self-Destruct Button
  "22020907": "goatUnsupported", // Hero Signal
  "22046459": "goatUnsupported", // Megamorph
  "22056710": "goatUnsupported", // Vampire Genesis
  "22359980": "goatUnsupported", // Mirror Wall
  "22419772": "goatUnsupported", // Fairy Guardian
  "22431243": "goatUnsupported", // Ultra Evolution Pill
  "22493811": "goatUnsupported", // Multiplication of Ants
  "22537443": "goatUnsupported", // Sebek's Blessing
  "22567609": "goatUnsupported", // Nimble Momonga
  "22589918": "goatUnsupported", // Reload
  "22609617": "goatUnsupported", // Mataza the Zapper
  "22702055": "goatUnsupported", // Umi
  "22796548": "goatUnsupported", // Archfiend's Oath
  "22873798": "goatUnsupported", // Hyena
  "22910685": "goatVanilla", // Green Phantom King
  "22959079": "goatUnsupported", // Dimensionhole
  "22996376": "goatUnsupported", // Behemoth the King of All Animals
  "23118924": "goatUnsupported", // Element Doom
  "23171610": "goatUnsupported", // Limiter Removal
  "23205979": "goatUnsupported", // Spirit Reaper
  "23265313": "goatUnsupported", // Cost Down
  "23265594": "goatUnsupported", // Heavy Mech Support Platform
  "23289281": "goatUnsupported", // Karate Man
  "23401839": "goatUnsupported", // Senju of the Thousand Hands
  "23424603": "goatUnsupported", // Wasteland
  "23471572": "goatUnsupported", // Solomon's Lawbook
  "23557835": "goatUnsupported", // Dimension Fusion
  "23615409": "goatUnsupported", // Insect Barrier
  "23701465": "goatUnsupported", // Primal Seed
  "23771716": "goatVanilla", // 7 Colored Fish
  "23842445": "goatUnsupported", // Nitro Unit
  "23927567": "goatUnsupported", // An Owl of Luck
  "23965037": "goatUnsupported", // Doriado's Blessing
  "24068492": "goatUnsupported", // Just Desserts
  "24094653": "goatUnsupported", // Polymerization
  "24096228": "goatUnsupported", // Double Spell
  "24128274": "goatUnsupported", // Deepsea Warrior
  "24140059": "goatUnsupported", // A Cat of Ill Omen
  "24221739": "goatUnsupported", // Protector of the Sanctuary
  "24294108": "goatUnsupported", // Burning Land
  "24311372": "goatVanilla", // Zoa
  "24317029": "goatUnsupported", // Gravekeeper's Spy
  "24435369": "goatUnsupported", // Mermaid Knight
  "24530661": "goatVanilla", // Master Kyonshee
  "24611934": "goatVanilla", // Ryu-Kishin Powered
  "24623598": "goatUnsupported", // Disappear
  "24668830": "goatUnsupported", // Germ Infection
  "25109950": "goatUnsupported", // The Little Swordsman of Aile
  "25119460": "goatDeckBlocked", // YZ-Tank Dragon
  "25236056": "goatUnsupported", // Rare Metal Dragon
  "25262697": "goatUnsupported", // Gravekeeper's Assailant
  "25290459": "goatUnsupported", // Level Up!
  "25343280": "goatUnsupported", // Spirit of the Pharaoh
  "25345186": "goatUnsupported", // After the Struggle
  "25551951": "goatUnsupported", // Blowback Dragon
  "25578802": "goatUnsupported", // Two-Man Cell Battle
  "25655502": "goatDeckBlocked", // Bickuribox
  "25769732": "goatUnsupported", // Machine Conversion Factory
  "25773409": "goatUnsupported", // Legendary Jujitsu Master
  "25833572": "goatUnsupported", // Gate Guardian
  "25880422": "goatUnsupported", // Block Attack
  "25955164": "goatUnsupported", // Sanga of the Thunder
  "26022485": "goatUnsupported", // Enervating Mist
  "26082229": "goatUnsupported", // Invasion of Flames
  "26084285": "goatUnsupported", // Gravekeeper's Watcher
  "26185991": "goatUnsupported", // Pinch Hopper
  "26202165": "goatUnsupported", // Sangan
  "26205777": "goatUnsupported", // Thestalos the Firestorm Monarch
  "26378150": "goatVanilla", // Rude Kaiser
  "26412047": "goatUnsupported", // Hammer Shot
  "26495087": "goatUnsupported", // Vampire Lady
  "26566878": "goatVanilla", // Fiend Scorpion
  "26725158": "goatUnsupported", // Exile of the Wicked
  "26902560": "goatUnsupported", // Fusion Sage
  "26931058": "goatUnsupported", // Formation Union
  "27053506": "goatUnsupported", // Secret Barrel
  "27125110": "goatVanilla", // Thousand-Eyes Idol
  "27132350": "goatUnsupported", // Fire Sorcerer
  "27134689": "goatDeckBlocked", // Master of Oz
  "27174286": "goatUnsupported", // Return from the Different Dimension
  "27288416": "goatVanilla", // Mokey Mokey
  "27324313": "goatVanilla", // Wattkid
  "27618634": "goatUnsupported", // The Unhappy Girl
  "27671321": "goatVanilla", // Lightning Conger
  "27744077": "goatUnsupported", // Absolute End
  "27770341": "goatUnsupported", // Super Rejuvenation
  "27911549": "goatUnsupported", // Parasite Paracide
  "27927359": "goatUnsupported", // Harpie Lady 2
  "27967615": "goatUnsupported", // Fusion Weapon
  "28003512": "goatVanilla", // The Judgement Hand
  "28106077": "goatUnsupported", // Cestus of Dagla
  "28121403": "goatUnsupported", // Really Eternal Rest
  "28143906": "goatUnsupported", // Roc from the Valley of Haze
  "28279543": "goatVanilla", // Curse of Dragon
  "28357177": "goatUnsupported", // Hade-Hane
  "28358902": "goatUnsupported", // Crimson Sentry
  "28470714": "goatUnsupported", // Bladefly
  "28546905": "goatVanilla", // Illusionist Faceless Mage
  "28563545": "goatUnsupported", // Dragon Seeker
  "28566710": "goatUnsupported", // Last Turn
  "28593363": "goatDeckBlocked", // Deepsea Shark
  "28596933": "goatUnsupported", // A Wingbeat of Giant Dragon
  "28649820": "goatUnsupported", // Embodiment of Apophis
  "28725004": "goatUnsupported", // Tainted Wisdom
  "28933734": "goatUnsupported", // Mask of Darkness
  "29155212": "goatUnsupported", // Pumpking the King of Ghosts
  "29172562": "goatVanilla", // Steel Ogre Grotto #1
  "29228529": "goatUnsupported", // Spell Reproduction
  "29267084": "goatUnsupported", // Shadow Spell
  "29380133": "goatUnsupported", // Yado Karu
  "29389368": "goatUnsupported", // Nutrient Z
  "29401950": "goatUnsupported", // Bottomless Trap Hole
  "29549364": "goatUnsupported", // Mask of Restrict
  "29618570": "goatUnsupported", // Gray Wing
  "29654737": "goatUnsupported", // Amazoness Chain Master
  "29692206": "goatVanilla", // Twin Long Rods #2
  "29735721": "goatUnsupported", // Spell Vanishing
  "29843091": "goatUnsupported", // Ojama Trio
  "30113682": "goatVanilla", // Judge Man
  "30170981": "goatUnsupported", // Spirit Message "L"
  "30190809": "goatUnsupported", // Gear Golem the Moving Fortress
  "30243636": "goatUnsupported", // Hungry Burger
  "30314994": "goatUnsupported", // Element Dragon
  "30325729": "goatVanilla", // Dokuroyaiba
  "30353551": "goatUnsupported", // Human-Wave Tactics
  "30450531": "goatUnsupported", // Rite of Spirit
  "30451366": "goatUnsupported", // Mystical Sheep #1
  "30531525": "goatUnsupported", // Enchanting Fitting Room
  "30532390": "goatVanilla", // Sky Scout
  "30606547": "goatUnsupported", // The Dark Door
  "30653113": "goatUnsupported", // Blessings of the Nile
  "30655537": "goatVanilla", // Cyber Falcon
  "30778711": "goatUnsupported", // Shadow Ghoul
  "30914564": "goatUnsupported", // Sacred Crane
  "31036355": "goatUnsupported", // Creature Swap
  "31066283": "goatUnsupported", // Revival of Dokurorider
  "31076103": "goatUnsupported", // The First Sarcophagus
  "31122090": "goatVanilla", // Gyakutenno Megami
  "31242786": "goatVanilla", // Souleater
  "31440542": "goatUnsupported", // Rafflesia Seduction
  "31447217": "goatVanilla", // Wingweaver
  "31476755": "goatUnsupported", // Dust Barrier
  "31477025": "goatVanilla", // Mr. Volcano
  "31553716": "goatUnsupported", // Spear Dragon
  "31560081": "goatTemplate", // Magician of Faith
  "31709826": "goatUnsupported", // Revival Jam
  "31785398": "goatUnsupported", // Ready for Intercepting
  "31786629": "goatUnsupported", // Thunder Dragon
  "31812496": "goatUnsupported", // Stone Statue of the Aztecs
  "31829185": "goatUnsupported", // Dark Necrofear
  "31893528": "goatUnsupported", // Spirit Message "I"
  "31987274": "goatVanilla", // Flying Fish
  "32012841": "goatVanilla", // Millennium Shield
  "32015116": "goatUnsupported", // Blind Destruction
  "32022366": "goatUnsupported", // Gravity Axe - Grarl
  "32062913": "goatUnsupported", // Mega Ton Magical Cannon
  "32240937": "goatUnsupported", // Ultimate Obedient Fiend
  "32268901": "goatUnsupported", // Salamandra
  "32269855": "goatVanilla", // The All-Seeing White Tiger
  "32274490": "goatVanilla", // Skull Servant
  "32298781": "goatUnsupported", // Triangle Power
  "32362575": "goatUnsupported", // Magical Merchant
  "32437102": "goatUnsupported", // Dragonic Attack
  "32452818": "goatVanilla", // Beaver Warrior
  "32539892": "goatUnsupported", // Minar
  "32541773": "goatVanilla", // The Portrait's Secret
  "32807846": "goatUnsupported", // Reinforcement of the Army
  "32809211": "goatUnsupported", // Jinzo #7
  "32919136": "goatUnsupported", // Falling Down
  "33031674": "goatUnsupported", // Incandescent Ordeal
  "33064647": "goatVanilla", // One-Eyed Shield Dragon
  "33066139": "goatUnsupported", // Reaper of the Cards
  "33114323": "goatUnsupported", // Metalsilver Armor
  "33178416": "goatVanilla", // Misairuzame
  "33184167": "goatCustom", // Tribe-Infecting Virus
  "33244944": "goatUnsupported", // Contract with Exodia
  "33396948": "goatUnsupported", // Exodia the Forbidden One
  "33413638": "goatUnsupported", // Cockroach Knight
  "33423043": "goatUnsupported", // D.D. Designator
  "33508719": "goatUnsupported", // Morphing Jar
  "33550694": "goatUnsupported", // Fusion Gate
  "33734439": "goatVanilla", // Three-Legged Zombies
  "33737664": "goatUnsupported", // Graverobber's Retribution
  "33767325": "goatUnsupported", // Meteor of Destruction
  "33784505": "goatUnsupported", // Jar Robber
  "33950246": "goatUnsupported", // Royal Command
  "33977496": "goatUnsupported", // Thousand Needles
  "34016756": "goatUnsupported", // Riryoku
  "34029630": "goatUnsupported", // Pitch-Black Power Stone
  "34088136": "goatUnsupported", // Ultimate Insect LV3
  "34100324": "goatVanilla", // Harpie Girl
  "34124316": "goatUnsupported", // Cyber Jar
  "34187685": "goatUnsupported", // Double Attack
  "34193084": "goatUnsupported", // Fear from the Dark
  "34206604": "notInGoatPool", // Magical Scientist
  "34236961": "goatUnsupported", // Ante
  "34290067": "goatVanilla", // Corroding Shark
  "34370473": "goatUnsupported", // Gryphon's Feather Duster
  "34442949": "goatVanilla", // Mechanical Snail
  "34460851": "goatVanilla", // Flame Manipulator
  "34627841": "goatUnsupported", // Kaibaman
  "34646691": "goatUnsupported", // Stumbling
  "34694160": "goatUnsupported", // The Eye of Truth
  "34830502": "goatUnsupported", // Ultimate Insect LV5
  "34853266": "goatUnsupported", // Tsukuyomi
  "34906152": "goatUnsupported", // Mass Driver
  "35027493": "goatUnsupported", // Deck Devastation Virus
  "35052053": "goatVanilla", // Insect Knight
  "35059553": "goatUnsupported", // Kaiser Colosseum
  "35149085": "goatUnsupported", // Beast Soul Swap
  "35215622": "goatUnsupported", // Blindly Loyal Goblin
  "35316708": "goatUnsupported", // Time Seal
  "35322812": "goatVanilla", // Woodborg Inpachi
  "35346968": "goatUnsupported", // Solemn Wishes
  "35429292": "goatUnsupported", // Pixie Knight
  "35565537": "goatVanilla", // Dark Witch
  "35686187": "goatUnsupported", // Tragedy
  "35762283": "goatUnsupported", // Heart of the Underdog
  "35798491": "goatUnsupported", // Darkbishop Archfiend
  "35809262": "goatDeckBlocked", // Elemental HERO Flame Wingman
  "35975813": "goatUnsupported", // Terrorking Archfiend
  "36021814": "goatUnsupported", // King of the Skull Servants
  "36039163": "goatUnsupported", // Penguin Knight
  "36119641": "goatVanilla", // Space Mambo
  "36121917": "goatVanilla", // Monster Egg
  "36261276": "goatUnsupported", // Interdimensional Matter Transporter
  "36262024": "goatUnsupported", // Black Dragon's Chick
  "36280194": "goatUnsupported", // Backup Soldier
  "36304921": "goatVanilla", // Witty Phantom
  "36361633": "goatUnsupported", // Threatening Roar
  "36468556": "goatUnsupported", // Ceasefire
  "36562627": "goatUnsupported", // Second Coin Toss
  "36584821": "goatUnsupported", // Gren Maju Da Eiza
  "36607978": "goatUnsupported", // Mystical Moon
  "36868108": "goatUnsupported", // Armored Glass
  "37053871": "goatUnsupported", // Astral Barrier
  "37083210": "goatUnsupported", // Cross Counter
  "37101832": "goatUnsupported", // Gravekeeper's Guard
  "37120512": "goatUnsupported", // Sword of Dark Destruction
  "37231841": "goatUnsupported", // Lighten the Load
  "37267041": "goatUnsupported", // Silent Swordsman LV7
  "37313348": "goatVanilla", // Turtle Tiger
  "37313786": "goatUnsupported", // Gamble
  "37406863": "goatUnsupported", // Fengsheng Mirror
  "37421579": "goatDeckBlocked", // Charubin the Fire Knight
  "37520316": "goatUnsupported", // Mind Control
  "37576645": "goatUnsupported", // Reckless Greed
  "37580756": "goatUnsupported", // Michizure
  "37620434": "goatUnsupported", // Shadow Tamer
  "37684215": "goatUnsupported", // Fusion Sword Murasame Blade
  "37721209": "goatUnsupported", // Levia-Dragon - Daedalus
  "37744402": "goatUnsupported", // Wynn the Wind Charmer
  "37820550": "goatUnsupported", // Electro-Whip
  "37957847": "goatUnsupported", // Insect Princess
  "37970940": "goatUnsupported", // Aussa the Earth Charmer
  "38033121": "goatUnsupported", // Dark Magician Girl
  "38142739": "goatVanilla", // Petit Angel
  "38199696": "goatUnsupported", // Red Medicine
  "38275183": "goatUnsupported", // Spell Shield Type-8
  "38277918": "goatVanilla", // Mikazukinoyaiba
  "38289717": "goatVanilla", // Crawling Dragon #2
  "38299233": "goatUnsupported", // Needle Wall
  "38369349": "goatUnsupported", // Manga Ryu-Ran
  "38411870": "goatUnsupported", // Needle Ceiling
  "38479725": "goatUnsupported", // The Trojan Horse
  "38480590": "goatUnsupported", // Lady Panther
  "38538445": "goatUnsupported", // Fushi No Tori
  "38552107": "goatUnsupported", // Horn of Light
  "38670435": "goatUnsupported", // Black Tyranno
  "38699854": "goatUnsupported", // Book of Taiyou
  "38723936": "goatUnsupported", // Question
  "38730226": "goatUnsupported", // The Agent of Wisdom - Mercury
  "38742075": "goatUnsupported", // Frontier Wiseman
  "38916461": "goatVanilla", // Roboyarou
  "38942059": "goatVanilla", // Sonic Maid
  "38992735": "goatUnsupported", // Wave-Motion Cannon
  "38999506": "goatVanilla", // Cosmo Queen
  "39004808": "goatVanilla", // Root Water
  "39019325": "goatUnsupported", // Order to Smash
  "39111158": "goatVanilla", // Tri-Horned Dragon
  "39131963": "goatUnsupported", // Des Counterblow
  "39168895": "goatUnsupported", // Berserk Gorilla
  "39191307": "goatUnsupported", // Masked Dragon
  "39256679": "goatVanilla", // Beta The Magnet Warrior
  "39507162": "goatUnsupported", // Blade Knight
  "39537362": "goatUnsupported", // Ordeal of a Traveler
  "39552864": "goatVanilla", // Mystical Shine Ball
  "39674352": "goatVanilla", // Gogiga Gagagigo
  "39711336": "goatUnsupported", // Fushioh Richie
  "39719977": "goatUnsupported", // Delta Attacker
  "39751093": "goatUnsupported", // Otohime
  "39774685": "goatUnsupported", // Vile Germs
  "39892082": "goatUnsupported", // Balloon Lizard
  "39897277": "goatUnsupported", // Elf's Light
  "39978267": "goatUnsupported", // Cyber Raider
  "40133511": "goatUnsupported", // Bazoo the Soul-Eater
  "40172183": "goatUnsupported", // Narrow Pass
  "40200834": "goatVanilla", // Sleeping Lion
  "40240595": "goatUnsupported", // Cocoon of Evolution
  "40267580": "goatUnsupported", // Brain Jacker
  "40320754": "goatUnsupported", // Lord Poison
  "40350910": "goatUnsupported", // Timidity
  "40374923": "goatVanilla", // Mammoth Graveyard
  "40410110": "goatUnsupported", // Homunculus the Alchemic Being
  "40453765": "goatUnsupported", // Swamp Battleguard
  "40473581": "goatUnsupported", // Susa Soldier
  "40619825": "goatUnsupported", // Axe of Despair
  "40633297": "goatUnsupported", // Bad Reaction to Simochi
  "40640057": "goatUnsupported", // Kuriboh
  "40659562": "goatUnsupported", // Guardian Sphinx
  "40695128": "goatUnsupported", // Maharaghi
  "40703393": "goatUnsupported", // The Puppet Magic of Dark Ruler
  "40737112": "goatUnsupported", // Dark Magician of Chaos
  "40826495": "goatVanilla", // Dissolverock
  "40884383": "goatUnsupported", // Chopman the Desperate Outlaw
  "40916023": "goatUnsupported", // Aqua Spirit
  "40933924": "goatUnsupported", // Dark Scorpion Burglars
  "40937767": "goatUnsupported", // Grave Ohja
  "41006930": "goatUnsupported", // Strike Ninja
  "41089128": "goatUnsupported", // Flame Ruler
  "41142615": "goatUnsupported", // The Cheerful Coffin
  "41218256": "goatVanilla", // Claw Reacher
  "41356845": "goatUnsupported", // Acid Trap Hole
  "41392891": "goatVanilla", // Feral Imp
  "41396436": "goatVanilla", // Blue-Winged Crown
  "41398771": "goatUnsupported", // Curse of Aging
  "41420027": "goatUnsupported", // Solemn Judgment
  "41426869": "goatUnsupported", // Black Illusion Ritual
  "41462083": "goatDeckBlocked", // Thousand Dragon
  "41482598": "notInGoatPool", // Mirage of Nightmare
  "41762634": "goatVanilla", // Giant Flea
  "41855169": "goatUnsupported", // Jowgen the Spiritualist
  "41859700": "goatUnsupported", // Burning Algae
  "41872150": "goatUnsupported", // Swarm of Locusts
  "41925941": "goatUnsupported", // Bark of Dark Ruler
  "41949033": "goatVanilla", // Dark Assailant
  "42071342": "goatVanilla", // Sea Serpent Warrior of Darkness
  "42129512": "goatVanilla", // Big Koala
  "42364257": "goatUnsupported", // Anti Raigeki
  "42364374": "goatUnsupported", // Arsenal Bug
  "42386471": "goatUnsupported", // Toon Gemini Elf
  "42431843": "goatVanilla", // Ancient Brain
  "42541548": "goatUnsupported", // Coach Goblin
  "42578427": "goatUnsupported", // Eatgaboon
  "42598242": "goatUnsupported", // Special Hurricane
  "42599677": "goatVanilla", // Flame Champion
  "42647539": "goatUnsupported", // Ryu-Kishin Clown
  "42664989": "goatUnsupported", // Card of Sanctity
  "42703248": "goatUnsupported", // Giant Trunade
  "42829885": "notInGoatPool", // The Forceful Sentry
  "42868711": "goatUnsupported", // Gora Turtle of Illusion
  "42883273": "goatUnsupported", // Wodan the Resident of the Forest
  "42941100": "goatVanilla", // Ojama Yellow
  "42994702": "goatUnsupported", // Wandering Mummy
  "43040603": "goatUnsupported", // Monster Gate
  "43230671": "goatVanilla", // Ancient Lizard Warrior
  "43250041": "goatUnsupported", // Draining Shield
  "43417563": "goatUnsupported", // Commencement Dance
  "43434803": "goatUnsupported", // The Shallow Grave
  "43487744": "goatUnsupported", // White Hole
  "43500484": "goatVanilla", // Darkworld Thorns
  "43509019": "goatUnsupported", // Toon Defense
  "43580269": "goatUnsupported", // Emes the Infinity
  "43586926": "goatUnsupported", // Twin-Headed Behemoth
  "43641473": "goatUnsupported", // Tailor of the Fickle
  "43694075": "goatUnsupported", // Novox's Prayer
  "43711255": "goatUnsupported", // Prohibition
  "43714890": "goatUnsupported", // Man-Thro' Tro'
  "43716289": "goatUnsupported", // Poison Mummy
  "43793530": "goatVanilla", // Giga Gagagigo
  "43973174": "goatUnsupported", // The Flute of Summoning Dragon
  "44072894": "goatUnsupported", // Supply
  "44073668": "goatVanilla", // Takriminos
  "44095762": "goatTemplate", // Mirror Force
  "44203504": "goatVanilla", // Robotic Knight
  "44209392": "goatUnsupported", // Castle Walls
  "44287299": "goatVanilla", // Masaki the Legendary Swordsman
  "44436472": "goatUnsupported", // Double Coston
  "44472639": "goatUnsupported", // Solar Ray
  "44519536": "goatVanilla", // Left Leg of the Forbidden One
  "44595286": "goatUnsupported", // Light of Judgment
  "44656491": "goatUnsupported", // Messenger of Peace
  "44762290": "goatUnsupported", // Opti-Camouflage Armor
  "44763025": "goatUnsupported", // Delinquent Duo
  "44913552": "goatUnsupported", // Timeater
  "45042329": "goatVanilla", // Tripwire Beast
  "45121025": "goatVanilla", // Ogre of the Black Shadow
  "45141844": "goatTemplate", // Old Vindictive Magician
  "45159319": "goatUnsupported", // Moai Interceptor Cannons
  "45231177": "goatDeckBlocked", // Flame Swordsman
  "45311864": "goatUnsupported", // Goblin Thief
  "45425051": "goatUnsupported", // Fairy King Truesdale
  "45547649": "goatUnsupported", // Birdface
  "45778932": "goatUnsupported", // Rising Air Current
  "45871897": "goatUnsupported", // Lost Guardian
  "45894482": "goatUnsupported", // Gilasaurus
  "45895206": "goatUnsupported", // Dark-Piercing Light
  "45985838": "goatUnsupported", // Solar Flare Dragon
  "45986603": "goatCustom", // Snatch Steal
  "46009906": "goatUnsupported", // Beast Fangs
  "46037213": "goatUnsupported", // Guardian Tryce
  "46130346": "goatUnsupported", // Hinotama
  "46181000": "goatUnsupported", // Frontline Base
  "46303688": "goatUnsupported", // Roulette Barrel
  "46363422": "goatUnsupported", // Skilled White Magician
  "46384672": "goatUnsupported", // Armed Dragon LV5
  "46411259": "goatUnsupported", // Metamorphosis
  "46461247": "goatUnsupported", // Trap Master
  "46474915": "goatVanilla", // Magical Ghost
  "46534755": "goatVanilla", // Fire Kraken
  "46571052": "goatUnsupported", // Vampiric Orchis
  "46657337": "goatUnsupported", // Muka Muka
  "46700124": "goatUnsupported", // Machine King
  "46820049": "goatUnsupported", // Mefist the Infernal General
  "46821314": "goatVanilla", // Humanoid Slime
  "46918794": "goatUnsupported", // Tremendous Fire
  "46986414": "goatVanilla", // Dark Magician
  "47025270": "goatUnsupported", // Helping Robo for Combat
  "47060154": "goatVanilla", // Mystic Clown
  "47150851": "goatUnsupported", // Guardian Grarl
  "47233801": "goatUnsupported", // Dark Snake Syndrome
  "47355498": "goatUnsupported", // Necrovalley
  "47372349": "goatVanilla", // Acrobat Monkey
  "47415292": "goatUnsupported", // Pitch-Dark Dragon
  "47453433": "goatUnsupported", // Back to Square One
  "47480070": "goatUnsupported", // Amazoness Paladin
  "47507260": "goatUnsupported", // Mystic Swordsman LV2
  "47606319": "goatUnsupported", // Gigantes
  "47693640": "goatUnsupported", // Zombie Tiger
  "47829960": "goatUnsupported", // Chaosrider Gustaph
  "47852924": "goatUnsupported", // Soul of the Pure
  "47879985": "goatVanilla", // Guardian of the Throne Room
  "47942531": "goatUnsupported", // Great Maju Garzett
  "48092532": "goatUnsupported", // D.D. Survivor
  "48094997": "goatVanilla", // Battle Footballer
  "48148828": "goatUnsupported", // D.D. Crazy Beast
  "48202661": "goatVanilla", // Aitsu
  "48206762": "goatUnsupported", // Fulfillment of the Contract
  "48229808": "goatUnsupported", // Horus the Black Flame Dragon LV8
  "48276469": "goatUnsupported", // Chain Burst
  "48305365": "goatVanilla", // Axe Raider
  "48365709": "goatVanilla", // Ansatsu
  "48539234": "goatUnsupported", // Appropriate
  "48576971": "goatUnsupported", // Necklace of Command
  "48579379": "goatUnsupported", // Perfectly Ultimate Great Moth
  "48642904": "goatUnsupported", // Mesmeric Control
  "48649353": "goatVanilla", // Ushi Oni
  "48659020": "goatUnsupported", // Spirit Caller
  "48768179": "goatUnsupported", // Dark Scorpion - Gorg the Strong
  "49003308": "goatVanilla", // Gagagigo
  "49010598": "goatUnsupported", // Divine Wrath
  "49064413": "goatUnsupported", // The Masked Beast
  "49140998": "goatUnsupported", // A Feather of the Phoenix
  "49217579": "goatUnsupported", // Mirage Knight
  "49218300": "goatVanilla", // Sorcerer of the Doomed
  "49251811": "goatUnsupported", // Mystic Probe
  "49328340": "goatUnsupported", // Spiral Spear Strike
  "49398568": "goatUnsupported", // Serial Spell
  "49441499": "goatUnsupported", // Ultimate Insect LV1
  "49563947": "goatVanilla", // Neo Aqua Madoor
  "49587034": "goatUnsupported", // Lightforce Sword
  "49681811": "goatUnsupported", // Freed the Matchless General
  "49771608": "goatUnsupported", // Absorbing Kid from the Sky
  "49791927": "goatVanilla", // Tiger Axe
  "49814180": "goatUnsupported", // Master Monk
  "49868263": "goatDeckBlocked", // Ryu Senshi
  "49881766": "goatVanilla", // Archfiend Soldier
  "49888191": "goatVanilla", // Garnecia Elefantis
  "49998907": "goatUnsupported", // Fruits of Kozaky's Studies
  "50005633": "goatVanilla", // Swordstalker
  "50045299": "goatUnsupported", // Dragon Capture Jar
  "501000000": "goatUnsupported", // Ulevo
  "501000001": "goatUnsupported", // Meteo the Matchless
  "501000002": "goatUnsupported", // King of Destruction - Xexex
  "501000003": "goatUnsupported", // Queen of Fate - Eternia
  "50122883": "goatUnsupported", // Bite Shoes
  "50152549": "goatUnsupported", // Paralyzing Potion
  "50259460": "goatUnsupported", // Versago the Destroyer
  "50287060": "goatUnsupported", // Archfiend of Gilfer
  "50412166": "goatUnsupported", // Charm of Shabti
  "50593156": "goatUnsupported", // Sand Gambler
  "50705071": "goatUnsupported", // Metalzoa
  "50712728": "goatUnsupported", // Gravekeeper's Curse
  "50725996": "goatUnsupported", // Dark Magician Knight
  "50823978": "goatUnsupported", // Piranha Army
  "50913601": "goatUnsupported", // Mountain
  "50930991": "goatVanilla", // Neo the Magic Swordsman
  "50939127": "goatUnsupported", // Different Dimension Dragon
  "51267887": "goatUnsupported", // Raise Body Heat
  "51275027": "goatUnsupported", // The Unhappy Maiden
  "51345461": "goatUnsupported", // Sword Hunter
  "51351302": "goatUnsupported", // A Man with Wdjat
  "51355346": "goatUnsupported", // Gaia Soul the Combustible Collective
  "51371017": "goatUnsupported", // Princess of Tsurugi
  "51394546": "goatUnsupported", // Cemetary Bomb
  "51402177": "goatUnsupported", // Sphinx Teleia
  "51452091": "goatUnsupported", // Royal Decree
  "51481927": "goatUnsupported", // Spell Absorption
  "51482758": "goatUnsupported", // Remove Trap
  "51534754": "goatUnsupported", // Yomi Ship
  "51562916": "goatUnsupported", // Big Wave Small Wave
  "51616747": "goatUnsupported", // Nubian Guard
  "51632798": "goatUnsupported", // Fusilier Dragon, the Dual-Mode Beast
  "51828629": "goatDeckBlocked", // Giltia the D. Knight
  "51838385": "goatUnsupported", // Theban Nightmare
  "51934376": "goatVanilla", // Kabazauls
  "51945556": "goatUnsupported", // Zaborg the Thunder Monarch
  "52040216": "goatUnsupported", // Harpie's Pet Dragon
  "52077741": "goatUnsupported", // Obnoxious Celtic Guard
  "52090844": "goatUnsupported", // Bowganian
  "52097679": "goatUnsupported", // Shield & Sword
  "52101615": "goatUnsupported", // The Dark - Hex-Sealed Fusion
  "52121290": "goatVanilla", // Spherous Lady
  "52323207": "goatUnsupported", // Golem Sentry
  "52417194": "goatUnsupported", // Heavy Slump
  "52503575": "goatUnsupported", // Final Attack Orders
  "52550973": "goatVanilla", // Pharaoh's Servant
  "52571838": "goatUnsupported", // Creeping Doom Manta
  "52584282": "goatVanilla", // Hercules Beetle
  "52624755": "goatUnsupported", // Peten the Dark Clown
  "52648457": "goatUnsupported", // Gorgon's Eye
  "52675689": "goatUnsupported", // Invitation to a Dark Sleep
  "52684508": "goatUnsupported", // Inferno Fire Blast
  "52768103": "goatUnsupported", // KA-2 Des Scissors
  "52817046": "goatUnsupported", // Mind Wipe
  "52824910": "goatUnsupported", // Kaiser Glider
  "52860176": "goatUnsupported", // Possessed Dark Soul
  "53046408": "goatUnsupported", // Emergency Provisions
  "53112492": "goatUnsupported", // Anti-Spell
  "53119267": "goatUnsupported", // Magical Thorn
  "53129443": "notInGoatPool", // Dark Hole
  "53153481": "goatVanilla", // Armaill
  "53183600": "goatUnsupported", // Blue-Eyes Toon Dragon
  "53239672": "goatUnsupported", // Spirit Barrier
  "53293545": "goatVanilla", // Firegrass
  "53347303": "goatUnsupported", // Blue-Eyes Shining Dragon
  "53375573": "goatVanilla", // Dark King of the Abyss
  "53493204": "goatUnsupported", // Goddess with the Third Eye
  "53530069": "goatUnsupported", // Spirit of the Breeze
  "53539634": "goatDeckBlocked", // Sanwitch
  "53569894": "goatUnsupported", // Pyramid of Light
  "53582587": "goatTemplate", // Torrential Tribute
  "53693416": "goatUnsupported", // Eagle Eye
  "53776525": "goatVanilla", // Gigobyte
  "53839837": "goatUnsupported", // Vampire Lord
  "53890795": "goatUnsupported", // Rocket Jumper
  "53982768": "goatUnsupported", // Dark Ruler Ha Des
  "54098121": "goatUnsupported", // Mysterious Puppeteer
  "54109233": "goatUnsupported", // Infinite Dismissal
  "54178050": "goatUnsupported", // Dragon's Rage
  "54351224": "goatUnsupported", // Ritual Weapon
  "54415063": "goatUnsupported", // Harpie Lady 3
  "54541900": "goatDeckBlocked", // Karbonala Warrior
  "54579801": "goatVanilla", // High Tide Gyojin
  "54652250": "goatUnsupported", // Man-Eater Bug
  "54704216": "goatUnsupported", // Nightmare Wheel
  "54752875": "goatDeckBlocked", // Twin-Headed Thunder Dragon
  "54878498": "goatUnsupported", // Kelbek
  "55001420": "goatUnsupported", // Arcane Archer of the Forest
  "55013285": "goatUnsupported", // Troop Dragon
  "55144522": "goatTemplate", // Pot of Greed
  "55226821": "goatUnsupported", // Lightning Blade
  "55256016": "goatUnsupported", // Judgment of Anubis
  "55291359": "goatVanilla", // Succubus Knight
  "55321970": "goatUnsupported", // Gust Fan
  "55348096": "goatUnsupported", // Arsenal Robber
  "55444629": "goatVanilla", // Lesser Dragon
  "55608151": "goatUnsupported", // Gryphon Wing
  "55761792": "goatUnsupported", // Black Luster Ritual
  "55763552": "goatUnsupported", // Dragon Piper
  "55773067": "goatUnsupported", // Drop Off
  "55784832": "goatVanilla", // Morinphen
  "55821894": "goatUnsupported", // Amazoness Fighter
  "55875323": "goatUnsupported", // Electric Lizard
  "55991637": "goatUnsupported", // Dragon's Gunfire
  "55998462": "goatVanilla", // Metal Fish
  "56058888": "goatUnsupported", // Royal Surrender
  "56094445": "goatUnsupported", // Ancient Gear Soldier
  "56120475": "goatTemplate", // Sakuretsu Armor
  "56246017": "goatUnsupported", // Archfiend's Roar
  "56260110": "goatUnsupported", // Raimei
  "56283725": "goatVanilla", // Kumootoko
  "56342351": "goatVanilla", // M-Warrior #1
  "56369281": "goatVanilla", // Wolf Axwielder
  "56387350": "goatUnsupported", // Vampire Baby
  "56413937": "goatDeckBlocked", // Warrior of Tradition
  "56433456": "goatUnsupported", // The Sanctuary in the Sky
  "56460688": "goatUnsupported", // Different Dimension Gate
  "56594520": "goatUnsupported", // Gaia Power
  "56647086": "goatUnsupported", // Invader of Darkness
  "56747793": "goatUnsupported", // United We Stand
  "56769674": "goatUnsupported", // DNA Transplant
  "56789759": "goatVanilla", // Tyhone #2
  "56830749": "goatUnsupported", // Share the Pain
  "56907389": "goatDeckBlocked", // Musician King
  "56916805": "goatUnsupported", // Energy Drain
  "56948373": "goatUnsupported", // Mask of the Accursed
  "56995655": "goatUnsupported", // Ominous Fortunetelling
  "57046845": "goatUnsupported", // Gearfried the Swordmaster
  "57069605": "goatUnsupported", // Frozen Soul
  "57116033": "goatUnsupported", // Winged Kuriboh
  "57139487": "goatUnsupported", // Chain Disappearance
  "57182235": "goatUnsupported", // Token Thanksgiving
  "57270476": "goatUnsupported", // Grave Lure
  "57281778": "goatUnsupported", // Ryu Kokki
  "57305373": "goatVanilla", // Two-Mouth Darkruler
  "57405307": "goatVanilla", // Winged Dragon, Guardian of the Fortress #2
  "57409948": "goatUnsupported", // Bombardment Beetle
  "57482479": "goatUnsupported", // Luminous Soldier
  "57579381": "goatUnsupported", // Darklord Marie
  "57585212": "goatUnsupported", // Self-Destruct Button
  "57617178": "goatUnsupported", // Sonic Bird
  "57839750": "goatUnsupported", // Mother Grizzly
  "57882509": "goatUnsupported", // Mask of Weakness
  "57953380": "goatUnsupported", // Card of Safe Return
  "58015506": "goatUnsupported", // Pikeru's Second Sight
  "58192742": "goatVanilla", // Petit Moth
  "58268433": "goatUnsupported", // Blade Rabbit
  "58314394": "goatVanilla", // Ground Attacker Bugroth
  "58392024": "goatUnsupported", // Mispolymerization
  "58528964": "goatDeckBlocked", // Flame Ghost
  "58538870": "goatVanilla", // Oppressed People
  "58551308": "goatUnsupported", // Spear Cretin
  "58577036": "goatUnsupported", // Reasoning
  "58607704": "goatUnsupported", // Fiend's Hand Mirror
  "58621589": "goatUnsupported", // Shadow of Eyes
  "58696829": "goatVanilla", // Bio-Mage
  "58818411": "goatVanilla", // Empress Mantis
  "58831685": "goatVanilla", // Giant Red Seasnake
  "58851034": "goatUnsupported", // Cursed Seal of the Forbidden Spell
  "58861941": "goatUnsupported", // Ooguchi
  "58921041": "goatUnsupported", // Anti-Spell Fragrance
  "58932615": "goatVanilla", // Elemental HERO Burstinatrix
  "59053232": "goatVanilla", // Turu-Purun
  "59197169": "goatUnsupported", // Yami
  "59237154": "goatUnsupported", // Shifting Shadows
  "59290628": "goatUnsupported", // Nightmare Horse
  "59344077": "goatUnsupported", // Magic Drain
  "59364406": "goatUnsupported", // Burning Beast
  "59380081": "goatUnsupported", // Big-Tusked Mammoth
  "59383041": "goatVanilla", // Toon Alligator
  "59560625": "goatUnsupported", // Shift
  "59744639": "goatUnsupported", // Windstorm of Etaqua
  "59784896": "goatUnsupported", // Dark Zebra
  "59820352": "goatUnsupported", // Earth Chant
  "59983499": "goatVanilla", // Dancing Elf
  "60082869": "goatUnsupported", // Dust Tornado
  "60102563": "goatUnsupported", // Maji-Gire Panda
  "60229110": "goatUnsupported", // Granmarg the Rock Monarch
  "60258960": "goatUnsupported", // Legendary Flame Lord
  "60365591": "goatUnsupported", // Shinato's Ark
  "60369732": "goatUnsupported", // Final Ritual of the Ancients
  "60391791": "goatUnsupported", // Senri Eye
  "60482781": "goatUnsupported", // Mystic Swordsman LV6
  "60519422": "goatUnsupported", // Kishido Spirit
  "60682203": "goatUnsupported", // Cold Wave
  "60764581": "goatUnsupported", // Stray Lambs
  "60802233": "goatVanilla", // Kuwagata α
  "60806437": "goatUnsupported", // UFO Turtle
  "60862676": "goatVanilla", // Flame Cerebrus
  "60866277": "goatUnsupported", // Earthshaker
  "60912752": "goatUnsupported", // D.D. Borderline
  "61044390": "goatUnsupported", // Chaos End
  "61127349": "goatUnsupported", // Big Bang Shot
  "61166988": "goatUnsupported", // Wild Nature's Release
  "61181383": "goatUnsupported", // Battery Charger
  "61204971": "goatDeckBlocked", // Elemental HERO Thunder Giant
  "61370518": "goatUnsupported", // Skull Archfiend of Lightning
  "61405855": "goatUnsupported", // Sword of Dragon's Soul
  "61411502": "goatUnsupported", // Elemental Burst
  "61441708": "goatUnsupported", // Sacred Phoenix of Nephthys
  "61505339": "goatUnsupported", // The Creator
  "61528025": "goatUnsupported", // Banisher of the Light
  "61587183": "goatUnsupported", // Dark Scorpion - Chick the Yellow
  "61622107": "goatUnsupported", // Bubble Crash
  "61705417": "goatUnsupported", // Graverobber
  "61740673": "notInGoatPool", // Imperial Order
  "61831093": "goatUnsupported", // Greenkappa
  "61844784": "goatUnsupported", // Magic Reflector
  "61854111": "goatUnsupported", // Legendary Sword
  "62113340": "goatVanilla", // Divine Dragon Ragnarok
  "62279055": "goatUnsupported", // Magic Cylinder
  "62325062": "goatUnsupported", // Adhesion Trap Hole
  "62327910": "goatVanilla", // Mighty Guard
  "62340868": "goatUnsupported", // Kazejin
  "62397231": "goatVanilla", // Hyozanryu
  "62420419": "goatUnsupported", // Reshef the Dark Being
  "62473983": "goatUnsupported", // Gravekeeper's Chief
  "62543393": "goatUnsupported", // Lekunga
  "62633180": "goatUnsupported", // Assault on GHQ
  "62651957": "goatVanilla", // X-Head Cannon
  "62762898": "goatVanilla", // Parrot Dragon
  "62867251": "goatUnsupported", // Light of Intervention
  "62966332": "goatUnsupported", // Convulsion of Nature
  "63012333": "goatUnsupported", // Soul-Absorbing Bone Tower
  "63018132": "goatUnsupported", // Dragon Manipulator
  "63102017": "goatUnsupported", // Stop Defense
  "63120904": "goatUnsupported", // Orca Mega-Fortress of Darkness
  "63142001": "goatUnsupported", // Batteryman AA
  "63162310": "goatUnsupported", // Wall Shadow
  "63308047": "goatVanilla", // Terra the Terrible
  "63356631": "goatUnsupported", // Phoenix Wing Wind Blast
  "63391643": "goatUnsupported", // Thousand Knives
  "63442604": "goatUnsupported", // Physical Double
  "63519819": "goatDeckBlocked", // Thousand-Eyes Restrict
  "63571750": "goatUnsupported", // Pharaoh's Treasure
  "63689843": "goatUnsupported", // Attack and Receive
  "63695531": "goatUnsupported", // Gravekeeper's Spear Soldier
  "63789924": "goatUnsupported", // Smoke Grenade of the Thief
  "63995093": "goatUnsupported", // Machine Duplication
  "64047146": "goatUnsupported", // Horn of the Unicorn
  "64274292": "goatUnsupported", // Meteorain
  "64306248": "goatUnsupported", // Skull-Mark Ladybug
  "64335804": "goatUnsupported", // Red-Eyes Black Metal Dragon
  "64342551": "goatUnsupported", // Amphibious Bugroth MK-3
  "64389297": "goatUnsupported", // Magical Labyrinth
  "64500000": "goatUnsupported", // Z-Metal Tank
  "64501875": "goatVanilla", // Hibikime
  "64538655": "goatUnsupported", // Sasuke Samurai #4
  "64631466": "goatUnsupported", // Relinquished
  "64697231": "goatUnsupported", // Trap Dustshoot
  "64734921": "goatUnsupported", // The Agent of Creation - Venus
  "64751286": "goatUnsupported", // Penumbral Soldier Lady
  "64752646": "goatUnsupported", // Fire Princess
  "64801562": "goatUnsupported", // Heart of Clear Water
  "65064143": "goatUnsupported", // Anti-Aircraft Flower
  "65169794": "goatUnsupported", // Black Pendant
  "65240384": "goatUnsupported", // Big Shield Gardna
  "65260293": "goatUnsupported", // Element Magician
  "65287621": "goatUnsupported", // Dark Driceratops
  "65396880": "goatUnsupported", // Huge Revolution
  "65403020": "goatUnsupported", // The End of Anubis
  "65458948": "goatUnsupported", // Toon Mermaid
  "65475294": "goatUnsupported", // The Unfriendly Amazon
  "65570596": "goatVanilla", // Red Archery Girl
  "65622692": "goatUnsupported", // Y-Dragon Head
  "65810489": "goatUnsupported", // Statue of the Wicked
  "65830223": "goatUnsupported", // Coffin Seller
  "65878864": "goatUnsupported", // Nobleman-Eater Bug
  "65957473": "goatVanilla", // Metal Armored Bug
  "66073051": "goatVanilla", // Warrior of Zera
  "66235877": "goatDeckBlocked", // Fiend Skull Dragon
  "66362965": "goatUnsupported", // The Fiend Megacyber
  "66516792": "goatVanilla", // Serpent Night Dragon
  "66526672": "goatUnsupported", // Labyrinth of Nightmare
  "66602787": "goatVanilla", // Saggi the Dark Clown
  "66672569": "goatVanilla", // Dragon Zombie
  "66690411": "goatUnsupported", // Mind on Air
  "66712593": "goatUnsupported", // Element Soldier
  "66719324": "goatUnsupported", // Rain of Mercy
  "66742250": "goatUnsupported", // Curse of Anubis
  "66788016": "goatUnsupported", // Fissure
  "66889139": "goatDeckBlocked", // Gaia the Dragon Champion
  "66926224": "goatUnsupported", // The Law of the Normal
  "66927994": "goatVanilla", // Oni Tank T-34
  "66989694": "goatVanilla", // The Earl of Demise
  "67048711": "goatUnsupported", // 7
  "67049542": "goatVanilla", // Dark Bat
  "67105242": "goatVanilla", // Earthbound Spirit
  "67284908": "goatVanilla", // Labyrinth Wall
  "67287533": "goatUnsupported", // Spirit Message "N"
  "67371383": "goatVanilla", // Amphibian Beast
  "67464807": "goatUnsupported", // Dora of Fate
  "67494157": "goatVanilla", // Crawling Dragon
  "67532912": "goatVanilla", // Science Soldier
  "67629977": "goatUnsupported", // Hoshiningen
  "67724379": "goatVanilla", // Koumori Dragon
  "67934141": "goatUnsupported", // Ultimate Baseball Kid
  "67957315": "goatUnsupported", // Spirit Ryu
  "67959180": "goatUnsupported", // Goddess of Whim
  "67987611": "goatUnsupported", // Amazoness Archers
  "68005187": "goatUnsupported", // Soul Exchange
  "68007326": "goatUnsupported", // Guardian Angel Joan
  "68049471": "goatVanilla", // The Gross Ghost of Fled Dreams
  "68057622": "goatUnsupported", // Continuous Destruction Punch
  "68073522": "goatUnsupported", // Soul Absorption
  "68170903": "goatUnsupported", // A Feint Plan
  "68191243": "goatUnsupported", // Mustering of the Dark Scorpions
  "68304813": "goatUnsupported", // Precious Cards from Beyond
  "68334074": "goatUnsupported", // Miracle Restoring
  "68400115": "goatUnsupported", // The Emperor's Holiday
  "68401546": "goatVanilla", // Fairy's Gift
  "68427465": "goatUnsupported", // Wicked-Breaking Flamberge - Baou
  "68516705": "goatVanilla", // Mystic Horseman
  "68540058": "goatUnsupported", // Metalmorph
  "68638985": "goatVanilla", // Slime Toad
  "68658728": "goatUnsupported", // Little Chimera
  "68811206": "goatUnsupported", // Tyler the Great Warrior
  "68846917": "goatVanilla", // Rock Ogre Grotto #1
  "69015963": "goatUnsupported", // Cyber-Stein
  "69035382": "goatUnsupported", // Contract with the Abyss
  "69122763": "goatUnsupported", // Deal of Phantom
  "69140098": "goatVanilla", // Gemini Elf
  "69162969": "goatUnsupported", // Lightning Vortex
  "69196160": "goatUnsupported", // Thunder Crash
  "69243953": "notInGoatPool", // Butterfly Dagger - Elma
  "69279219": "goatUnsupported", // My Body as a Shield
  "69296555": "goatUnsupported", // Array of Revealing Light
  "69313735": "goatUnsupported", // Checkmate
  "69455834": "goatVanilla", // King of Yamimakai
  "69456283": "goatUnsupported", // Koitsu
  "69542930": "goatUnsupported", // Dedication through Light and Darkness
  "69572024": "goatVanilla", // Tongyo
  "69579761": "goatUnsupported", // Des Koala
  "69750536": "goatVanilla", // Wow Warrior
  "69832741": "goatUnsupported", // Spirit Elimination
  "69954399": "goatUnsupported", // Ekibyo Drakmord
  "70046172": "goatUnsupported", // Rush Recklessly
  "70074904": "goatUnsupported", // D.D. Assailant
  "70138455": "goatUnsupported", // Blast Juggler
  "70231910": "goatUnsupported", // Dark Core
  "70307656": "goatUnsupported", // Mucus Yolk
  "70344351": "goatUnsupported", // Riryoku Field
  "70345785": "goatVanilla", // Yamadron
  "70368879": "goatTemplate", // Upstart Goblin
  "70681994": "goatDeckBlocked", // Dragoness the Wicked Knight
  "70781052": "goatVanilla", // Summoned Skull
  "70791313": "goatUnsupported", // Royal Magical Library
  "70797118": "goatUnsupported", // Thunder Nyan Nyan
  "70821187": "goatUnsupported", // Regenerating Mummy
  "70828912": "goatCustom", // Premature Burial
  "70861343": "goatUnsupported", // Ninjitsu Art of Transformation
  "70903634": "goatVanilla", // Right Arm of the Forbidden One
  "71044499": "goatUnsupported", // Nobleman of Crossout
  "71068263": "goatVanilla", // Stuffed Animal
  "71107816": "goatUnsupported", // The Bistro Butcher
  "71200730": "goatUnsupported", // Despair from the Dark
  "71280811": "goatVanilla", // Yaranzo
  "71283180": "goatUnsupported", // Tornado Bird
  "71407486": "goatVanilla", // Fireyarou
  "71413901": "goatCustom", // Breaker the Magical Warrior
  "71453557": "goatUnsupported", // Autonomous Action Unit
  "71466592": "goatUnsupported", // Maryokutai
  "71544954": "goatUnsupported", // Megarock Dragon
  "71625222": "goatUnsupported", // Time Wizard
  "71829750": "goatUnsupported", // Serpentine Princess
  "71983925": "goatUnsupported", // Talisman of Spell Sealing
  "72053645": "goatUnsupported", // Weather Report
  "72192100": "goatUnsupported", // Desrook Archfiend
  "72302403": "goatUnsupported", // Swords of Revealing Light
  "72405967": "goatUnsupported", // Royal Tribute
  "72575145": "goatUnsupported", // Demotion
  "72630549": "goatUnsupported", // Chaos Command Magician
  "72657739": "goatUnsupported", // Malice Doll of Demise
  "72842870": "goatVanilla", // Tyhone
  "72892473": "goatUnsupported", // Card Destruction
  "72929454": "goatVanilla", // Turtle Bird
  "72989439": "goatUnsupported", // Black Luster Soldier - Envoy of the Beginning
  "73001017": "goatUnsupported", // Silpheed
  "73051941": "goatVanilla", // Sand Stone
  "73079365": "goatUnsupported", // Gust
  "73081602": "goatVanilla", // Queen Bird
  "73134081": "goatUnsupported", // Final Flame
  "73216412": "goatVanilla", // Worm Drake
  "73219648": "goatUnsupported", // Vilepawn Archfiend
  "73398797": "goatUnsupported", // Paladin of White Dragon
  "73414375": "goatUnsupported", // Dimension Jar
  "73431236": "goatUnsupported", // Iron Blacksmith Kotetsu
  "73481154": "goatVanilla", // Destroyer Golem
  "73544866": "goatUnsupported", // Guardian Baou
  "73574678": "goatUnsupported", // Amazoness Blowpiper
  "73578229": "goatUnsupported", // Pole Position
  "73628505": "goatUnsupported", // Terraforming
  "73698349": "goatUnsupported", // Giant Orc
  "73752131": "goatUnsupported", // Skilled Dark Magician
  "73879377": "goatUnsupported", // Armed Dragon LV7
  "73915051": "goatUnsupported", // Scapegoat
  "74131780": "goatTemplate", // Exiled Force
  "74137509": "goatUnsupported", // Graceful Dice
  "74153887": "goatUnsupported", // Dark Scorpion - Meanae the Thorn
  "74191942": "notInGoatPool", // Painful Choice
  "74270067": "goatUnsupported", // Pikeru's Circle of Enchantment
  "74364659": "goatUnsupported", // Eria the Water Charmer
  "74367458": "goatUnsupported", // Guardian Elma
  "74388798": "goatUnsupported", // Silent Swordsman LV5
  "74458486": "goatUnsupported", // Covering Fire
  "74591968": "goatUnsupported", // Mystic Swordsman LV4
  "74637266": "goatVanilla", // Octoberser
  "74677422": "goatVanilla", // Red-Eyes Black Dragon
  "74694807": "goatUnsupported", // Re-Fusion
  "74701381": "goatUnsupported", // DNA Surgery
  "74703140": "goatDeckBlocked", // Punished Eagle
  "74713516": "goatUnsupported", // Dark Mimic LV1
  "74823665": "goatUnsupported", // Inferno
  "74848038": "goatUnsupported", // Monster Reincarnation
  "74923978": "goatUnsupported", // Forced Requisition
  "75043725": "goatUnsupported", // Emissary of the Afterlife
  "75109441": "goatUnsupported", // Cobraman Sakuzy
  "75209824": "goatUnsupported", // Guardian Statue
  "75285069": "goatUnsupported", // Moisture Creature
  "75347539": "goatUnsupported", // Valkyrion the Magna Warrior
  "75356564": "goatVanilla", // Petit Dragon
  "75372290": "goatUnsupported", // Total Defense Shogun
  "75375465": "goatUnsupported", // Pandemonium Watchbear
  "75376965": "goatVanilla", // Enchanting Mermaid
  "75392615": "goatUnsupported", // Mind Haxorz
  "75417459": "goatUnsupported", // Release Restraint
  "75487237": "goatUnsupported", // Mid Shield Gardna
  "75499502": "goatVanilla", // Master & Expert
  "75559356": "goatVanilla", // Cyber Soldier of Darkworld
  "75560629": "goatUnsupported", // Flint
  "75582395": "goatVanilla", // Faith Bird
  "75646520": "goatUnsupported", // Metal Detector
  "75745607": "goatUnsupported", // Hino-Kagu-Tsuchi
  "75782277": "goatUnsupported", // Harpies' Hunting Ground
  "75830094": "goatUnsupported", // Horus the Black Flame Dragon LV4
  "75889523": "goatVanilla", // Archfiend Marmot of Nefariousness
  "75923050": "goatDeckBlocked", // Super Robolady
  "75946257": "goatUnsupported", // Witch Doctor of Chaos
  "75953262": "goatVanilla", // Warrior Dai Grepher
  "76052811": "goatUnsupported", // Helpoemer
  "76075810": "goatUnsupported", // Throwstone Unit
  "76103675": "goatUnsupported", // Sparks
  "76184692": "goatVanilla", // Hitotsu-Me Giant
  "76211194": "goatVanilla", // Meda Bat
  "76297408": "goatUnsupported", // Soul Demolition
  "76305638": "goatUnsupported", // The Rock Spirit
  "76321376": "goatUnsupported", // Mine Golem
  "76446915": "goatVanilla", // Disk Magician
  "76515293": "goatUnsupported", // Xing Zhen Hu
  "76532077": "goatUnsupported", // Bottomless Shifting Sand
  "76539047": "goatUnsupported", // Poison Fangs
  "76754619": "goatUnsupported", // Pyramid Energy
  "76775123": "goatUnsupported", // Patrol Robo
  "76806714": "goatUnsupported", // Turtle Oath
  "76812113": "goatVanilla", // Harpie Lady
  "76848240": "goatUnsupported", // Non Aggression Area
  "76862289": "goatUnsupported", // Yamata Dragon
  "76909279": "goatUnsupported", // Enraged Battle Ox
  "76922029": "goatUnsupported", // Don Zaloog
  "77007920": "goatUnsupported", // Laser Cannon Armor
  "77027445": "goatUnsupported", // Power of Kaishin
  "77044671": "goatUnsupported", // Pyramid Turtle
  "77084837": "goatUnsupported", // Inaba White Rabbit
  "77121851": "goatUnsupported", // Manticore of Darkness
  "77379481": "goatUnsupported", // Sasuke Samurai #3
  "77414722": "goatUnsupported", // Magic Jammer
  "77491079": "goatUnsupported", // Gale Lizard
  "77527210": "goatUnsupported", // Soul of Purity and Light
  "77561728": "goatUnsupported", // Disturbance Strategy
  "77585513": "goatCustom", // Jinzo
  "77622396": "goatUnsupported", // Reverse Trap
  "77754944": "goatUnsupported", // Widespread Ruin
  "77827521": "goatVanilla", // Trial of Nightmare
  "77876207": "goatUnsupported", // Secret Pass to the Treasures
  "77910045": "goatUnsupported", // Fatal Abacus
  "78010363": "notInGoatPool", // Witch of the Black Forest
  "78053598": "goatUnsupported", // Dark Designator
  "78060096": "goatVanilla", // Terrorking Salmon
  "78193831": "goatUnsupported", // Buster Blader
  "78243409": "goatUnsupported", // The Thing in the Crater
  "78266168": "goatUnsupported", // Giant Axe Mummy
  "78423643": "goatVanilla", // Three-Headed Geedo
  "78613627": "goatUnsupported", // Des Kangaroo
  "78636495": "goatUnsupported", // Slate Warrior
  "78658564": "goatUnsupported", // Goblin Attack Force
  "78697395": "goatUnsupported", // The Third Sarcophagus
  "78706415": "notInGoatPool", // Fiber Jar
  "78780140": "goatVanilla", // Trent
  "78783370": "goatUnsupported", // Barrel Behind the Door
  "78861134": "goatVanilla", // Darkfire Soldier #2
  "78864369": "goatUnsupported", // Soul Reversal
  "78984772": "goatVanilla", // Twin-Headed Fire Dragon
  "78986941": "goatUnsupported", // Order to Charge
  "79106360": "goatUnsupported", // Morphing Jar #2
  "79109599": "goatUnsupported", // King of the Swamp
  "79182538": "goatVanilla", // Mad Dog of Darkness
  "79323590": "goatUnsupported", // Chain Energy
  "79335209": "goatVanilla", // Ojama Black
  "79571449": "goatUnsupported", // Graceful Charity
  "79575620": "goatCustom", // Injection Fairy Lily
  "79629370": "goatVanilla", // Maiden of the Moonlight
  "79649195": "goatUnsupported", // Armor Break
  "79759861": "goatUnsupported", // Tribute to the Doomed
  "79853073": "goatUnsupported", // Cipher Soldier
  "79870141": "goatUnsupported", // Mad Sword Beast
  "79875176": "goatUnsupported", // Toon Cannon Soldier
  "80071763": "goatDeckBlocked", // Dark Balter the Terrible
  "80141480": "goatVanilla", // Hunter Spider
  "80161395": "goatUnsupported", // Mystik Wok
  "80163754": "goatUnsupported", // Burst Breath
  "80168720": "goatUnsupported", // Darkness Approaches
  "80193355": "goatUnsupported", // Dramatic Rescue
  "80233946": "goatUnsupported", // Gora Turtle
  "80316585": "goatUnsupported", // Cyber Harpie Lady
  "80441106": "goatUnsupported", // Keldo
  "80604091": "goatUnsupported", // Ultimate Offering
  "80741828": "goatUnsupported", // Witch's Apprentice
  "80770678": "goatVanilla", // Spirit of the Harp
  "80811661": "goatUnsupported", // Hamburger Recipe
  "80863132": "goatUnsupported", // Muko
  "81057959": "goatVanilla", // D. Human
  "81172176": "goatUnsupported", // Fiend Comedian
  "81210420": "goatUnsupported", // Magical Hats
  "81306586": "goatUnsupported", // Nightmare Penguin
  "81325903": "goatUnsupported", // Amazoness Spellcaster
  "81380218": "goatUnsupported", // Chorus of Sanctuary
  "81383947": "goatUnsupported", // White Magician Pikeru
  "81385346": "goatUnsupported", // Stamping Destruction
  "81386177": "goatVanilla", // Bottom Dweller
  "81480460": "goatUnsupported", // Barrel Dragon
  "81777047": "goatUnsupported", // Luminous Spark
  "81820689": "goatUnsupported", // The Inexperienced Spy
  "81843628": "goatUnsupported", // Needle Worm
  "81863068": "goatUnsupported", // Hiro's Shadow Scout
  "81985784": "goatUnsupported", // Des Feral Imp
  "82003859": "goatUnsupported", // Toll
  "82005435": "goatUnsupported", // Lady Ninja Yae
  "82035781": "goatUnsupported", // Twinheaded Beast
  "82065276": "goatVanilla", // Oscillo Hero
  "82085619": "goatVanilla", // Shining Friendship
  "82108372": "goatUnsupported", // Mudora
  "82260502": "goatUnsupported", // Hieracosphinx
  "82301904": "notInGoatPool", // Chaos Emperor Dragon - Envoy of the End
  "82432018": "goatUnsupported", // Mask of Brutality
  "82452993": "goatUnsupported", // Lone Wolf
  "82482194": "goatUnsupported", // Millennium Scorpion
  "82529174": "goatUnsupported", // Ray of Hope
  "82542267": "goatUnsupported", // Gravedigger Ghoul
  "82642348": "goatUnsupported", // Kryuel
  "82705573": "goatUnsupported", // Backfire
  "82732705": "goatUnsupported", // Skill Drain
  "82828051": "goatUnsupported", // Earthquake
  "82999629": "goatUnsupported", // Umiiruka
  "83011277": "goatUnsupported", // Mystic Tomato
  "83104731": "goatUnsupported", // Ancient Gear Golem
  "83133491": "goatUnsupported", // Zero Gravity
  "83225447": "goatUnsupported", // Stim-Pack
  "83228073": "goatUnsupported", // Two Thousand Needles
  "83241722": "goatUnsupported", // Dice Re-Roll
  "83258273": "goatUnsupported", // Robbin' Zombie
  "83464209": "goatVanilla", // Mystical Sheep #2
  "83555666": "goatCustom", // Ring of Destruction
  "83675475": "goatUnsupported", // Token Feastevil
  "83746708": "goatUnsupported", // Mage Power
  "83764718": "notInGoatPool", // Monster Reborn
  "83764996": "goatVanilla", // The Illusory Gentleman
  "83887306": "goatUnsupported", // Two-Pronged Attack
  "83968380": "goatUnsupported", // Jar of Greed
  "83986578": "goatUnsupported", // King Tiger Wanghu
  "83994646": "goatUnsupported", // 4-Starred Ladybug of Doom
  "84080938": "goatUnsupported", // The Forgiving Maiden
  "84257639": "goatUnsupported", // Dian Keto the Cure Master
  "84327329": "goatVanilla", // Elemental HERO Clayman
  "84397023": "goatUnsupported", // Level Conversion Lab
  "84430950": "goatUnsupported", // Armed Samurai - Ben Kei
  "84550200": "goatUnsupported", // Sonic Jammer
  "84620194": "goatVanilla", // Girochin Kuwagata
  "84636823": "goatUnsupported", // Spell Canceller
  "84686841": "goatVanilla", // King Fog
  "84696266": "goatVanilla", // Sonic Duck
  "84740193": "goatUnsupported", // Buster Rancher
  "84814897": "goatUnsupported", // Kiryu
  "84834865": "goatUnsupported", // Flying Kamakiri #1
  "84926738": "goatUnsupported", // The Immortal of Thunder
  "84970821": "goatUnsupported", // Curse of Darkness
  "84990171": "goatVanilla", // Bean Soldier
  "85166216": "goatUnsupported", // Elephant Statue of Blessing
  "85309439": "goatVanilla", // Ray & Temperature
  "85326399": "goatVanilla", // Spike Seadra
  "85359414": "goatUnsupported", // Freezing Beast
  "85489096": "goatUnsupported", // Arsenal Summoner
  "85519211": "goatUnsupported", // Minefield Eruption
  "85562745": "goatUnsupported", // Dark Room of Nightmare
  "85602018": "goatUnsupported", // Last Will
  "85605684": "goatUnsupported", // Berserk Dragon
  "85639257": "goatVanilla", // Aqua Madoor
  "85684223": "goatDeckBlocked", // Reaper on the Nightmare
  "85705804": "goatVanilla", // Kurama
  "85742772": "goatUnsupported", // Gravity Bind
  "85802526": "goatUnsupported", // Cure Mermaid
  "85936485": "goatVanilla", // United Resistance
  "86088138": "goatVanilla", // Ocubeam
  "86099788": "goatDeckBlocked", // The Last Warrior from Another Planet
  "86198326": "goatUnsupported", // 7 Completed
  "86281779": "goatVanilla", // Gadget Soldier
  "86318356": "goatUnsupported", // Sogen
  "86325596": "goatVanilla", // Baron of the Fiend Sword
  "86327225": "goatUnsupported", // Shinato, King of a Higher Plane
  "86498013": "goatVanilla", // D.D. Trainer
  "86569121": "goatVanilla", // Melchid the Four-Face Beast
  "86652646": "goatVanilla", // Skull Dog Marron
  "86801871": "goatUnsupported", // Cobra Jar
  "86805855": "goatDeckBlocked", // Dark Blade the Dragon Knight
  "86988864": "goatUnsupported", // 3-Hump Lacooda
  "87010442": "goatUnsupported", // Legacy Hunter
  "87210505": "goatUnsupported", // Knight's Title
  "87303357": "goatVanilla", // Shining Abyss
  "87322377": "goatVanilla", // Launcher Spider
  "87340664": "goatUnsupported", // Atomic Firefly
  "87430998": "goatUnsupported", // Forest
  "87473172": "goatUnsupported", // Firebird
  "87511987": "goatVanilla", // Spikebot
  "87523462": "goatUnsupported", // Winged Sage Falcos
  "87557188": "goatUnsupported", // The Stern Mystic
  "87564352": "goatVanilla", // Blackland Fire Dragon
  "87621407": "goatTemplate", // Dekoichi the Battlechanted Locomotive
  "87751584": "goatDeckBlocked", // Gatling Dragon
  "87756343": "goatUnsupported", // Larvae Moth
  "87774234": "goatUnsupported", // Watapon
  "87796900": "goatVanilla", // Winged Dragon, Guardian of the Fortress #1
  "87880531": "goatUnsupported", // Diffusion Wave-Motion
  "87910978": "goatUnsupported", // Brain Control
  "87997872": "goatUnsupported", // Theinen the Great Sphinx
  "88089103": "goatUnsupported", // The Graveyard in the Fourth Dimension
  "88132637": "goatUnsupported", // Twin-Headed Wolf
  "88236094": "goatUnsupported", // Aswan Apparition
  "88240808": "goatUnsupported", // Kycoo the Ghost Destroyer
  "88279736": "goatUnsupported", // Robbin' Goblin
  "88472456": "goatUnsupported", // Zombyra the Dark
  "88619463": "goatUnsupported", // Sorcerer of Dark Magic
  "88696724": "goatUnsupported", // The Earth - Hex-Sealed Fusion
  "88733579": "goatUnsupported", // Drill Bug
  "88753985": "goatUnsupported", // Fox Fire
  "88789641": "goatUnsupported", // Hallowed Life Barrier
  "88819587": "goatVanilla", // Baby Dragon
  "88975532": "goatUnsupported", // Pitch-Black Warwolf
  "88979991": "goatVanilla", // Killer Needle
  "88989706": "goatUnsupported", // Great Dezard
  "89041555": "goatUnsupported", // Blast Held by a Tribute
  "89091579": "goatVanilla", // Basic Insect
  "89111398": "goatUnsupported", // Dark Dust Spirit
  "89112729": "goatDeckBlocked", // Cyber Saurus
  "89258225": "goatUnsupported", // Winged Minion
  "89272878": "goatVanilla", // Guardian of the Labyrinth
  "89405199": "goatUnsupported", // Greed
  "89494469": "goatVanilla", // Dark Titan of Terror
  "89628781": "goatUnsupported", // Ninjitsu Art of Decoy
  "89631139": "goatVanilla", // Blue-Eyes White Dragon
  "89698120": "goatUnsupported", // Tactical Espionage Expert
  "89718302": "goatUnsupported", // Abare Ushioni
  "89731911": "goatUnsupported", // Familiar Knight
  "89801755": "goatUnsupported", // Abyssal Designator
  "89959682": "goatVanilla", // Pharaonic Protector
  "89997728": "goatUnsupported", // Toon Table of Contents
  "90020065": "goatUnsupported", // Jigen Bakudan
  "90140980": "goatDeckBlocked", // Ojama King
  "90147755": "goatUnsupported", // Lady Assailant of Flames
  "90219263": "goatUnsupported", // Elegant Egotist
  "90337190": "goatUnsupported", // Torpedo Fish
  "90357090": "goatVanilla", // Silver Fang
  "90407382": "goatUnsupported", // The Kick Man
  "90502999": "goatUnsupported", // Ground Collapse
  "90669991": "goatUnsupported", // Pineapple Blast
  "90740329": "goatUnsupported", // Taunt
  "90790253": "goatUnsupported", // Little-Winguard
  "90810762": "goatUnsupported", // Raging Flame Sprite
  "90846359": "goatUnsupported", // Rivalry of Warlords
  "90908427": "goatVanilla", // Steel Ogre Grotto #2
  "90925163": "goatUnsupported", // Dancing Fairy
  "90928333": "goatUnsupported", // Dark Factory of Mass Production
  "90963488": "goatVanilla", // Nemuriko
  "90980792": "goatUnsupported", // Dark Jeroid
  "91123920": "goatUnsupported", // The Agent of Force - Mars
  "91152256": "goatVanilla", // Celtic Guardian
  "91345518": "goatUnsupported", // The Agent of Judgment - Saturn
  "91512835": "goatUnsupported", // Insect Queen
  "91559748": "goatUnsupported", // Prickle Fairy
  "91595718": "goatUnsupported", // Book of Secret Arts
  "91781589": "goatUnsupported", // Thunder of Ruler
  "91782219": "goatUnsupported", // Crab Turtle
  "91842653": "goatUnsupported", // Toon Summoned Skull
  "91862578": "goatUnsupported", // Enraged Muka Muka
  "91869203": "goatUnsupported", // Amazoness Archer
  "91932350": "goatUnsupported", // Harpie Lady 1
  "91939608": "goatVanilla", // Rogue Doll
  "91996584": "goatVanilla", // Whiptail Crow
  "91998119": "goatDeckBlocked", // XYZ-Dragon Cannon
  "92084010": "goatUnsupported", // Unshaven Angler
  "92377303": "goatUnsupported", // Dark Sage
  "92394653": "goatUnsupported", // Spirit's Invitation
  "92408984": "goatUnsupported", // The Dragon's Bead
  "92421852": "goatVanilla", // Robolady
  "92667214": "goatVanilla", // Clown Zombie
  "92731455": "goatVanilla", // M-Warrior #2
  "92755808": "goatUnsupported", // Element Saurus
  "92854392": "goatUnsupported", // Staunch Defender
  "92924317": "goatUnsupported", // Soul Resurrection
  "93013676": "goatUnsupported", // Maha Vailo
  "93016201": "goatUnsupported", // Royal Oppression
  "93107608": "goatUnsupported", // Howling Insect
  "93108297": "goatVanilla", // Liquid Beast
  "93108433": "goatUnsupported", // Monster Recovery
  "93220472": "goatUnsupported", // Cave Dragon
  "93221206": "goatVanilla", // Ancient Elf
  "93343894": "goatVanilla", // Water Magician
  "93346024": "goatVanilla", // The Dragon Dwelling in the Cave
  "93382620": "goatUnsupported", // Rope of Life
  "93553943": "goatVanilla", // Man Eater
  "93599951": "goatUnsupported", // Dark Spirit of the Silent
  "93671934": "goatUnsupported", // Morale Boost
  "93747864": "goatUnsupported", // Desert Sunlight
  "93889755": "goatUnsupported", // Crass Clown
  "93900406": "goatUnsupported", // Mushroom Man #2
  "93920745": "goatUnsupported", // Penguin Soldier
  "94004268": "goatUnsupported", // Amazoness Swords Woman
  "94119974": "goatVanilla", // Two-Headed King Rex
  "94163677": "goatUnsupported", // Infinite Cards
  "94192409": "goatUnsupported", // Compulsory Evacuation Device
  "94212438": "goatUnsupported", // Destiny Board
  "94256039": "goatUnsupported", // Tower of Babel
  "94377247": "goatUnsupported", // Curse of the Masked Beast
  "94425169": "goatUnsupported", // Spring of Rebirth
  "94463200": "goatUnsupported", // Battle-Scarred
  "94568601": "goatUnsupported", // Tyrant Dragon
  "94585852": "goatUnsupported", // Pandemonium
  "94667532": "goatUnsupported", // Mecha-Dog Marron
  "94675535": "goatVanilla", // Larvas
  "94739788": "goatUnsupported", // Remove Brainwashing
  "94772232": "goatUnsupported", // Spirit Message "A"
  "94773007": "goatUnsupported", // Jirai Gumo
  "94793422": "goatUnsupported", // Rod of the Mind's Eye
  "94905343": "goatDeckBlocked", // Rabid Horseman
  "95051344": "goatUnsupported", // Eternal Rest
  "95132338": "goatUnsupported", // Aqua Chorus
  "95144193": "goatDeckBlocked", // Kwagar Hercules
  "95174353": "goatUnsupported", // Ameba
  "95178994": "goatUnsupported", // Giant Germ
  "95194279": "goatUnsupported", // Dimension Distortion
  "95214051": "goatUnsupported", // Jade Insect Whistle
  "95220856": "goatUnsupported", // Vengeful Bog Spirit
  "95281259": "goatUnsupported", // The Warrior Returning Alive
  "95286165": "goatUnsupported", // De-Fusion
  "95288024": "goatVanilla", // Sky Dragon
  "95308449": "goatUnsupported", // Final Countdown
  "95451366": "goatUnsupported", // Exhausting Spell
  "95472621": "goatUnsupported", // Big Burn
  "95492061": "goatUnsupported", // Manju of the Ten Thousand Hands
  "95515060": "goatUnsupported", // Rod of Silence - Kay'est
  "95614612": "goatUnsupported", // Cannonball Spear Shellfish
  "95638658": "goatUnsupported", // Shooting Star Bow - Ceal
  "95727991": "goatUnsupported", // Catapult Turtle
  "95744531": "goatUnsupported", // Griggle
  "95789089": "goatUnsupported", // Kangaroo Champ
  "95841282": "goatUnsupported", // Cat's Ear Tribe
  "95952802": "goatDeckBlocked", // Flower Wolf
  "95956346": "goatUnsupported", // Shining Angel
  "96316857": "goatUnsupported", // Recycle
  "96355986": "goatUnsupported", // Enchanted Javelin
  "96420087": "goatUnsupported", // Contract with the Dark Master
  "96458440": "goatUnsupported", // Legendary Black Belt
  "96501677": "goatUnsupported", // Catnipped Kitty
  "96561011": "goatUnsupported", // Red-Eyes Darkness Dragon
  "96631852": "goatUnsupported", // Impenetrable Formation
  "96677818": "goatUnsupported", // Spellbook Organization
  "96851799": "goatVanilla", // Hinotama Soul
  "96890582": "goatUnsupported", // Flash Assailant
  "96947648": "goatUnsupported", // Salvage
  "96965364": "goatUnsupported", // Insect Imitation
  "96967123": "goatVanilla", // Dharma Cannon
  "96981563": "goatVanilla", // Giant Turtle Who Feeds on Flames
  "97017120": "goatUnsupported", // Giant Rat
  "97077563": "goatCustom", // Call of the Haunted
  "97093037": "goatUnsupported", // The Creator Incarnate
  "97169186": "goatUnsupported", // Smashing Ground
  "97342942": "goatUnsupported", // Ectoplasmer
  "97360116": "goatVanilla", // Unknown Warrior of Fiend
  "97439308": "goatUnsupported", // Chaos Greed
  "97570038": "goatUnsupported", // Kaminote Blow
  "97590747": "goatVanilla", // La Jinn the Mystical Genie of the Lamp
  "97623219": "goatUnsupported", // Element Valkyrie
  "97642679": "goatUnsupported", // Dark Master - Zorc
  "97687912": "goatUnsupported", // Fairy Meteor Crush
  "97806240": "goatUnsupported", // Forced Ceasefire
  "97809599": "goatUnsupported", // Seal of the Ancients
  "97923414": "goatVanilla", // Inpachi
  "98045062": "goatUnsupported", // Enemy Controller
  "98049915": "goatUnsupported", // Mystic Lamp
  "98069388": "goatUnsupported", // Horn of Heaven
  "98139712": "goatUnsupported", // Skull Invitation
  "98162242": "goatUnsupported", // Needle Burrower
  "98239899": "goatUnsupported", // Blast with Chain
  "98252586": "goatUnsupported", // Follow Wind
  "98299011": "goatUnsupported", // Gift of The Mystical Elf
  "98374133": "goatUnsupported", // Invigoration
  "98434877": "goatUnsupported", // Suijin
  "98446407": "goatUnsupported", // Hand of Nephthys
  "98456117": "goatVanilla", // Boneheimer
  "98495314": "goatUnsupported", // Sword of Deep-Seated
  "98502113": "goatDeckBlocked", // Dark Paladin
  "98745000": "goatUnsupported", // Mystical Knight of Jackal
  "98792570": "goatUnsupported", // Gift of the Martyr
  "98818516": "goatVanilla", // Frenzied Panda
  "99050989": "goatUnsupported", // Drillago
  "99171160": "goatVanilla", // Kozaky
  "99173029": "goatUnsupported", // Spiritual Energy Settle Machine
  "99284890": "goatUnsupported", // Avatar of The Pot
  "99351431": "goatUnsupported", // The Secret of the Bandit
  "99414168": "goatUnsupported", // Elemental Mistress Doriado
  "99426834": "goatUnsupported", // Beastking of the Swamps
  "99510761": "goatVanilla", // Lord of the Lamp
  "99517131": "goatUnsupported", // The Spell Absorbing Life
  "99518961": "goatUnsupported", // Restructer Revolution
  "99551425": "goatDeckBlocked", // Labyrinth Tank
  "99597615": "goatUnsupported", // Malevolent Nuzzler
  "99690140": "goatUnsupported", // Gravekeeper's Vassal
  "99721536": "goatUnsupported", // Dokurorider
  "99724761": "goatDeckBlocked", // XZ-Tank Cannon
  "99785935": "goatVanilla", // Alpha The Magnet Warrior
  "99877698": "goatUnsupported", // Gravekeeper's Cannonholder
} as const satisfies Readonly<Record<string, CardCoverageStatus>>);
