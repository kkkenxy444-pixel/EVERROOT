Dibuat otomatis oleh npm run codemap. Jangan dibaca penuh; gunakan grep -n <nama> CODEMAP.md lalu sed -n 'A,Bp' <file>.

## src/data/assetKeys.js (22 KB, 475 baris)
L6 ASSET_BASE_PATH
L8 ASSET_KEYS
L121 charLayerKey
L128 cropStageKey
L134 IMAGE_ASSETS
L259 CHARACTER_ANIM_DEFS
L275 PLAYER_CHARACTER_PARTS
L276 NPC_HAIR_PARTS
L283 CHARACTER_PARTS
L287 NPC_CHARACTER_ACTIONS
L290 isCharacterLayerLoaded
L298 SPRITESHEET_ASSETS
L422 AUDIO_ASSETS

## src/data/audioConfig.js (7 KB, 128 baris)
L19 AUDIO_CONFIG

## src/data/crops.js (7 KB, 207 baris)
L7 CROP_UNLOCK_DAY_MAP
L16 getCropUnlockDay
L20 isCropUnlocked
L32 computeCropStage
L71 CROPS
L206 CROP_LIST

## src/data/dialogues.js (11 KB, 283 baris)
L18 NPC_DIALOGUES
L231 isLineEligible
L257 pickDialogueLines

## src/data/gameConfig.js (29 KB, 844 baris)
L5 SCENE_KEYS
L13 GAME
L29 TILE
L34 WORLD
L50 MAP_ZONES
L122 MAP_IDS
L127 MAP_TRANSITION
L141 VILLAGE_LAYOUT
L226 MAPS
L357 AMBIENT_ANIMALS
L451 LIVESTOCK
L471 NPC
L487 DIALOGUE
L501 PLAYER
L518 CAMERA
L527 DEPTH
L543 TIME
L583 WEATHER
L608 FARMING
L630 SEED_UNLOCK_SCHEDULE
L639 FISHING
L663 INVENTORY
L675 ECONOMY
L684 SAVE
L691 INPUT
L715 UI
L780 DEBUG
L790 isDebugModeEnabled
L802 getWorldZoom
L815 getUiScale
L827 getPhysicalCanvasSize

## src/data/items.js (12 KB, 428 baris)
L9 TOOL_IDS
L16 TOOLS
L48 ITEMS
L383 LEGACY_FISH_ID_MAP
L392 SEED_ITEM_IDS
L396 HARVEST_CROP_ITEM_IDS
L400 FISH_ITEM_IDS
L406 LIVESTOCK_ITEM_IDS
L411 SELLABLE_ITEM_IDS
L417 getSeedUnlockDay
L423 isSeedUnlocked

## src/data/npcs.js (2 KB, 46 baris)
L8 NPC_DEFS
L36 resolveNpcSpawns

## src/data/quests.js (7 KB, 209 baris)
L25 computeQuestReward
L33 QUESTS
L179 QUESTS_BY_ID
L187 STORED_QUEST_STATUSES
L194 sanitizeQuestState

## src/data/tileIndex.js (8 KB, 184 baris)
L9 TILESET_META
L20 tileAt
L25 tileCoords
L32 TILE_INDEX
L149 GRASS_VARIANTS
L164 DIRT_PATH_VARIANTS
L173 WATER_PATTERN_4X4
L181 waterTileFor

## src/data/villageStructures.js (7 KB, 93 baris)
L5 STRUCTURES
L83 PROPS

## src/entities/AmbientAnimal.js (11 KB, 347 baris)
L5 ANIMAL_TEXTURE_MAP
L15 ANIMAL_SFX_MAP
L25 PRODUCT_ICON_MAP
L30 randRange
L44 class AmbientAnimal
L45 constructor
L102 _isTooCloseToPeers
L121 _wouldApproachPeer
L144 _enterIdle
L158 _enterWalk
L232 setProductReady
L242 update
L326 destroy

## src/entities/Crop.js (4 KB, 126 baris)
L11 class Crop
L12 constructor
L38 sync
L120 destroy

## src/entities/NPC.js (6 KB, 182 baris)
L9 class NPC
L10 constructor
L78 isAlive
L82 distanceTo
L90 setQuestIndicator
L98 _playLayers
L108 _scheduleDoing
L119 _startDoing
L131 destroy

## src/entities/Player.js (9 KB, 262 baris)
L15 class Player
L16 constructor
L59 x
L63 y
L67 setPosition
L73 getTileCoords
L85 getFrontTile
L100 playSynced
L118 playOneShotAction
L146 setLockedStateAnimation
L155 unlockAction
L164 update
L217 _spawnDustPuff
L231 destroy

## src/main.js (8 KB, 273 baris)
L14 installGlobalErrorOverlay
L135 installPhysicalScaleBounds
L193 config
L230 game
L241 refreshScaleNow
L250 scheduleScaleRefresh

## src/scenes/BootScene.js (1 KB, 20 baris)
L9 class BootScene
L10 constructor
L14 create

## src/scenes/GameScene.js (55 KB, 1712 baris)
L48 class GameScene
L49 constructor
L53 init
L57 create
L203 _createMapLocalSystems
L253 _destroyMapLocalSystems
L289 _buildMap
L328 _teardownMap
L365 _switchMap
L393 _completeMapSwitch
L448 _cancelFishingForTransition
L462 _closePanelsForTransition
L476 _resetInputForTransition
L494 _tryUseGate
L512 _getSavedSpawnTile
L528 _getEntrySpawn
L537 _updateSavedPositionForCurrentMap
L554 _applyCameraFollow
L562 _createDebugStats
L580 _updateDebugStats
L597 _bindEvents
L830 _clearMorningCrowTimers
L850 _scheduleMorningCrowSequence
L883 _spawnAmbientAnimals
L938 _refreshLivestockVisuals
L954 _getNearbyReadyAnimal
L979 _tryCollectAnimalProduct
L1014 _updateCameraAndOverlay
L1049 _applyDayNightTint
L1071 _initWeatherVisuals
L1110 _updateRainVisual
L1176 _refreshQuestState
L1192 _onQuestCompleted
L1209 _saveCurrentState
L1219 flushSaveIfActive
L1229 _cycleTool
L1242 _emitToolChanged
L1261 _getEffectiveTargetTile
L1287 _handlePrimaryAction
L1416 _debugAdvanceDayImmediate
L1454 _startSleepSequence
L1547 update
L1645 _drawTargetCursor

## src/scenes/MenuScene.js (12 KB, 413 baris)
L19 class MenuScene
L20 constructor
L24 init
L28 create
L51 _transitionTo
L61 _renderMenu
L78 _drawBackgroundDecor
L121 _buildHeader
L171 _buildMenuButtons
L245 _buildAudioSettingsBar
L338 _createMenuButton
L385 _buildFooter

## src/scenes/PreloadScene.js (7 KB, 212 baris)
L21 class PreloadScene
L22 constructor
L26 preload
L142 create
L152 _ensureFallbackTexturesForFailedAssets
L170 _createGlobalAnimations

## src/scenes/UIScene.js (47 KB, 1533 baris)
L30 class UIScene
L31 constructor
L35 init
L39 create
L75 _leaveToScene
L102 _buildHudElements
L723 _refreshDebugAudioOverlay
L743 _drawFishingBar
L766 _createSmallTopButton
L805 _updateAudioPopoverLabels
L831 _spawnFloatingText
L863 _highlightToolSlot
L884 _computeDrawerMetrics
L942 isPointerOverStorageDrawer
L959 _layoutStorageDrawer
L992 _setDrawerScroll
L1007 _drawDrawerScrollbar
L1036 _relayout
L1120 _refreshTimeLabel
L1143 _syncInitialHud
L1161 _updateSeedDisplay
L1179 _updateStorageDisplay
L1227 _updateQuestTracker
L1251 _showToast
L1266 _bindEvents

## src/systems/AnimalTerrain.js (6 KB, 159 baris)
L3 CELL_LAND
L4 CELL_WATER
L5 CELL_FORBIDDEN
L20 class AnimalTerrain
L21 constructor
L53 _setCell
L58 _cellAtWorld
L65 _isFootprint
L75 isLandWalkable
L85 isWaterWalkable
L98 isLineWalkable
L121 findSpawnPosition

## src/systems/AudioManager.js (22 KB, 748 baris)
L10 class AudioManagerClass
L11 constructor
L42 _loadSettings
L72 _saveSettings
L92 getSettings
L101 _getEffectiveBgmVolume
L110 _getEffectiveAmbienceVolume
L123 init
L174 _pauseForVisibility
L191 _resumeFromVisibility
L218 unlockAudio
L235 _resumePendingLoops
L244 playSceneBgm
L310 playPhaseAmbience
L364 _crossfadeTracks
L410 _fadeOutAndDestroy
L427 _destroySoundSafe
L437 stopBgm
L458 stopAmbience
L479 _pruneActiveSfx
L496 playSfx
L613 getActiveSoundsSnapshot
L652 _applyVolumesToActiveTracks
L672 toggleMute
L681 setMusicLevel
L692 cycleMusicLevel
L700 setAmbienceLevel
L711 cycleAmbienceLevel
L719 setSfxLevel
L730 cycleSfxLevel
L738 _hasAudioInCache
L747 AudioManager

## src/systems/DialogueSystem.js (3 KB, 114 baris)
L13 class DialogueSystem
L14 constructor
L23 start
L46 startWithLines
L60 _begin
L75 advance
L86 close
L96 destroy
L102 _emitCurrentLine

## src/systems/EventBus.js (3 KB, 71 baris)
L7 eventBus
L9 EVENTS

## src/systems/FarmingSystem.js (15 KB, 444 baris)
L24 class FarmingSystem
L25 constructor
L43 _bindEvents
L59 applyRainWatering
L76 _restoreSavedPlots
L84 getPlot
L88 isHarvestReady
L96 getPlotStatusHint
L124 handleToolAction
L324 _harvestPlot
L369 onNewDay
L425 _syncEntity
L435 destroy

## src/systems/FishingSystem.js (16 KB, 519 baris)
L7 FISHING_STATES
L27 class FishingSystem
L28 constructor
L73 _bindEvents
L95 isActive
L104 isMovementLockedState
L116 findWaterTarget
L150 getFishingHint
L170 handleAction
L225 _startCasting
L239 _enterWaiting
L260 _enterBite
L273 _startReeling
L282 _completeCatch
L319 _rollFishId
L344 cancelFishing
L372 update
L450 _drawBobber
L477 _emitStateChanged
L495 destroy

## src/systems/FontLoader.js (3 KB, 91 baris)
L11 loadGameFont
L62 getTextResolution
L72 pixelTextStyle

## src/systems/InputSystem.js (6 KB, 166 baris)
L13 class InputSystem
L14 constructor
L36 _setupKeyboard
L91 _setupTouchDetection
L104 setTouchVector
L112 getMovementVector
L150 destroy

## src/systems/InventorySystem.js (22 KB, 691 baris)
L25 class InventorySystem
L30 sanitizeSlots
L64 createSlotsFromLegacyMap
L96 computeSummaryMap
L112 constructor
L131 _bindEvents
L165 _syncSummaryMap
L171 getSlots
L175 getMaxSlots
L179 getUsedSlotCount
L187 getCount
L194 canAddItem
L219 addItem
L287 removeItem
L333 takeItemsAndAddCoins
L385 getCurrentDay
L392 getUnlockedSeedIds
L400 getOwnedSeedIds
L411 ensureValidSelectedSeed
L436 cycleOwnedSeed
L475 buySeed
L531 getCatchableFishIds
L539 sellHarvestItem
L582 sellAllHarvest
L626 debugAddCoins
L642 debugFillSeeds
L667 emitState
L682 destroy

## src/systems/LivestockSystem.js (3 KB, 60 baris)
L12 class LivestockSystem
L13 getProductDef
L17 getLastCollectedDay
L26 isReady
L40 collect

## src/systems/QuestSystem.js (9 KB, 298 baris)
L19 QUEST_STATUS
L26 QUEST_INDICATOR
L31 class QuestSystem
L32 constructor
L56 _day
L60 _storedStatus
L64 _findLatestActiveId
L74 getQuest
L81 getStatus
L99 getProgress
L121 getNpcQuest
L137 getNpcIndicator
L150 getTrackerText
L179 talkTo
L241 _notifyChanged
L245 _rememberActive
L251 _forgetActive
L256 _lastActiveFromOrder
L265 _textLines
L272 _offerLines
L281 _reminderLines
L290 _doneLines

## src/systems/SaveSystem.js (12 KB, 377 baris)
L30 class SaveSystemClass
L31 constructor
L36 _readRaw
L48 _writeRaw
L61 _removeRaw
L76 createDefaultState
L132 _sanitizeTilePosition
L155 _sanitizeMapPositions
L174 _isSupportedVersion
L181 hasSave
L202 load
L353 save
L371 clear
L376 SaveSystem

## src/systems/StructureBuilder.js (5 KB, 150 baris)
L5 TILE_COLUMNS
L6 CACHE_PREFIX
L14 class StructureBuilder
L15 constructor
L19 getDef
L23 textureKey
L32 ensureStructureTexture
L99 addStructure
L119 ensurePropFrame
L131 addProp

## src/systems/TimeSystem.js (6 KB, 188 baris)
L10 class TimeSystem
L11 constructor
L31 emitInitialState
L37 getPhaseForHour
L48 getExactHour
L60 getTintForHour
L104 getCurrentTint
L108 formatClock
L114 getSnapshot
L127 setPaused
L131 update
L171 advanceToNextDay
L184 destroy

## src/systems/WeatherSystem.js (5 KB, 177 baris)
L14 DRY_PLAN
L27 hash01
L40 class WeatherSystem
L45 getPlanForDay
L54 isRainingAt
L60 _computePlan
L100 constructor
L109 _getDay
L113 _getHour
L127 update
L143 emitInitialState
L154 getSnapshot
L163 _emit
L173 destroy

## src/systems/WorldBuilder.js (44 KB, 1409 baris)
L27 createSeededRng
L42 class WorldBuilder
L43 constructor
L60 build
L79 _track
L84 _createTilemapLayers
L114 _buildFarmValley
L309 _buildVillage
L400 _buildVillageNpcs
L414 _paintVillageDirt
L433 _paintVillageFootpaths
L493 _buildVillageBorder
L535 _buildVillagePlazaFence
L553 _buildVillageDeadEnd
L571 _buildVillageStructure
L602 _addVillageProp
L631 _buildVillageHouseGardens
L668 _buildVillageNature
L769 _addVillageTree
L785 _addVillageWildflowers
L811 _isVillageDecorFree
L823 _paintPathFringes
L846 _isPerimeterGateTile
L865 _addGateZones
L890 getGateAt
L905 _buildPlayerHouse
L981 _buildShippingAndShopArea
L1084 _buildWindmill
L1103 _populateNature
L1229 _ensureCroppedFrame
L1236 _addTileCollider
L1250 _addRectCollider
L1258 _addTileRectCollider
L1269 isFarmableTile
L1273 isWaterTile
L1277 isDirtTile
L1281 isTileBlocked
L1294 getNearbyLandmark
L1349 getNearbyNpc
L1369 updateLandmarkLabels
L1383 destroy

## src/ui/DialogueBox.js (9 KB, 311 baris)
L12 class DialogueBox
L13 constructor
L77 _now
L81 _fontPx
L86 _nameStyle
L99 _bodyStyle
L111 _continueStyle
L122 _open
L134 _startLine
L158 _typeNext
L180 _finishTyping
L187 _advance
L198 _close
L213 _stopTimer
L228 relayout
L272 _drawPanel
L291 destroy

## src/ui/ShopModal.js (25 KB, 835 baris)
L25 class ShopModal
L26 constructor
L50 open
L59 close
L70 relayout
L79 refresh
L85 _getGameState
L89 _getRowItemIds
L93 _setScrollY
L102 _ensureRowVisible
L114 _updateScrollbarThumb
L137 render
L630 _createButton
L673 _triggerPrimaryOnRow
L685 _triggerSecondaryOnRow
L702 _bindScrollInput
L750 _bindKeyboard
L791 destroy

## src/ui/TouchControls.js (12 KB, 382 baris)
L15 class TouchControls
L16 constructor
L60 _buildJoystick
L67 _drawJoystickGraphics
L123 _buildActionButtons
L162 relayout
L202 _createCircleButton
L275 _bindPointers
L327 _updateJoystickFromPointer
L356 _resetJoystick
L365 setVisible
L369 destroy
