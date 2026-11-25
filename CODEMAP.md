Dibuat otomatis oleh npm run codemap. Jangan dibaca penuh; gunakan grep -n <nama> CODEMAP.md lalu sed -n 'A,Bp' <file>.

## src/data/assetKeys.js (23 KB, 486 baris)
L6 ASSET_BASE_PATH
L8 ASSET_KEYS
L125 charLayerKey
L132 cropStageKey
L138 IMAGE_ASSETS
L265 CHARACTER_ANIM_DEFS
L283 PLAYER_CHARACTER_PARTS
L284 NPC_HAIR_PARTS
L291 CHARACTER_PARTS
L295 NPC_CHARACTER_ACTIONS
L298 isCharacterLayerLoaded
L306 SPRITESHEET_ASSETS
L430 AUDIO_ASSETS

## src/data/audioConfig.js (7 KB, 131 baris)
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

## src/data/gameConfig.js (30 KB, 898 baris)
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
L626 RESOURCE_NODES
L684 SEED_UNLOCK_SCHEDULE
L693 FISHING
L717 INVENTORY
L729 ECONOMY
L738 SAVE
L745 INPUT
L769 UI
L834 DEBUG
L844 isDebugModeEnabled
L856 getWorldZoom
L869 getUiScale
L881 getPhysicalCanvasSize

## src/data/items.js (13 KB, 474 baris)
L9 TOOL_IDS
L18 TOOLS
L64 ITEMS
L423 LEGACY_FISH_ID_MAP
L432 SEED_ITEM_IDS
L436 HARVEST_CROP_ITEM_IDS
L440 FISH_ITEM_IDS
L446 LIVESTOCK_ITEM_IDS
L451 RESOURCE_ITEM_IDS
L456 SELLABLE_ITEM_IDS
L463 getSeedUnlockDay
L469 isSeedUnlocked

## src/data/npcs.js (2 KB, 46 baris)
L8 NPC_DEFS
L36 resolveNpcSpawns

## src/data/quests.js (7 KB, 209 baris)
L25 computeQuestReward
L33 QUESTS
L179 QUESTS_BY_ID
L187 STORED_QUEST_STATUSES
L194 sanitizeQuestState

## src/data/resourceNodes.js (5 KB, 177 baris)
L3 NODE_KINDS
L9 FARM_RESOURCE_NODE_DEFS
L30 VALID_RESOURCE_NODE_IDS
L34 TREE_RESOURCE_COORD_SET
L39 hashNodeDay
L59 getNodeStatsForDay
L98 getRespawnDays
L108 sanitizeNodesState
L123 isNodeDestroyed
L137 resolveNodeRespawns

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

## src/entities/Player.js (9 KB, 282 baris)
L15 class Player
L16 constructor
L59 x
L63 y
L67 setPosition
L76 facePoint
L93 getTileCoords
L105 getFrontTile
L120 playSynced
L138 playOneShotAction
L166 setLockedStateAnimation
L175 unlockAction
L184 update
L237 _spawnDustPuff
L251 destroy

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

## src/scenes/GameScene.js (58 KB, 1821 baris)
L50 class GameScene
L51 constructor
L55 init
L59 create
L206 _createMapLocalSystems
L274 _destroyMapLocalSystems
L315 _buildMap
L354 _teardownMap
L391 _switchMap
L419 _completeMapSwitch
L474 _cancelFishingForTransition
L491 _closePanelsForTransition
L505 _resetInputForTransition
L523 _tryUseGate
L541 _getSavedSpawnTile
L557 _getEntrySpawn
L566 _updateSavedPositionForCurrentMap
L583 _applyCameraFollow
L591 _createDebugStats
L619 _updateDebugStats
L636 _bindEvents
L872 _clearMorningCrowTimers
L892 _scheduleMorningCrowSequence
L925 _spawnAmbientAnimals
L980 _refreshLivestockVisuals
L996 _getNearbyReadyAnimal
L1021 _tryCollectAnimalProduct
L1056 _updateCameraAndOverlay
L1091 _applyDayNightTint
L1113 _initWeatherVisuals
L1152 _updateRainVisual
L1218 _refreshQuestState
L1234 _onQuestCompleted
L1251 _saveCurrentState
L1261 flushSaveIfActive
L1271 _cycleTool
L1284 _emitToolChanged
L1303 _getEffectiveTargetTile
L1329 _handlePrimaryAction
L1470 _debugAdvanceDayImmediate
L1508 _startSleepSequence
L1604 update
L1754 _drawTargetCursor

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

## src/scenes/UIScene.js (51 KB, 1641 baris)
L31 computeToolbarLayout
L82 class UIScene
L83 constructor
L87 init
L91 create
L129 _leaveToScene
L156 _buildHudElements
L824 _refreshDebugAudioOverlay
L844 _drawFishingBar
L867 _createSmallTopButton
L906 _updateAudioPopoverLabels
L932 _spawnFloatingText
L941 _highlightToolSlot
L962 _computeDrawerMetrics
L1020 isPointerOverStorageDrawer
L1037 _layoutStorageDrawer
L1070 _setDrawerScroll
L1085 _drawDrawerScrollbar
L1114 _relayout
L1210 _refreshTimeLabel
L1233 _syncInitialHud
L1251 _updateSeedDisplay
L1269 _updateStorageDisplay
L1317 _updateQuestTracker
L1325 _showToast
L1343 _bindEvents

## src/systems/AnimalTerrain.js (6 KB, 180 baris)
L3 CELL_LAND
L4 CELL_WATER
L5 CELL_FORBIDDEN
L20 class AnimalTerrain
L21 constructor
L53 _setCell
L62 setTileBlocked
L79 _cellAtWorld
L86 _isFootprint
L96 isLandWalkable
L106 isWaterWalkable
L119 isLineWalkable
L142 findSpawnPosition

## src/systems/AudioManager.js (22 KB, 754 baris)
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
L619 getActiveSoundsSnapshot
L658 _applyVolumesToActiveTracks
L678 toggleMute
L687 setMusicLevel
L698 cycleMusicLevel
L706 setAmbienceLevel
L717 cycleAmbienceLevel
L725 setSfxLevel
L736 cycleSfxLevel
L744 _hasAudioInCache
L753 AudioManager

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

## src/systems/InputSystem.js (6 KB, 178 baris)
L13 class InputSystem
L14 constructor
L36 _setupKeyboard
L101 _setupTouchDetection
L114 setTouchVector
L122 getMovementVector
L160 destroy

## src/systems/InventorySystem.js (23 KB, 712 baris)
L25 class InventorySystem
L30 sanitizeSlots
L64 createSlotsFromLegacyMap
L96 computeSummaryMap
L112 constructor
L133 _bindEvents
L167 _syncSummaryMap
L173 getSlots
L177 getMaxSlots
L181 getUsedSlotCount
L189 getCount
L196 canAddItem
L221 addItem
L289 removeItem
L335 takeItemsAndAddCoins
L387 getCurrentDay
L394 getUnlockedSeedIds
L402 getOwnedSeedIds
L413 ensureValidSelectedSeed
L438 cycleOwnedSeed
L481 buySeed
L544 getCatchableFishIds
L552 sellHarvestItem
L595 sellAllHarvest
L639 debugAddCoins
L655 debugFillSeeds
L680 emitState
L703 destroy

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

## src/systems/ResourceNodeSystem.js (17 KB, 524 baris)
L25 class ResourceNodeSystem
L26 requiredKindForTool
L32 getToolMetaForKind
L49 constructor
L99 _getCurrentDay
L103 _getNodes
L109 _isTileOccupied
L131 syncInitialState
L147 _handleNewDay
L180 findNearestNodeInReach
L231 getTargetNode
L241 getAnyNodeInReach
L249 getNodeHint
L269 hasHighlightedNode
L273 _clearTargetHighlight
L284 updateTargetHighlight
L326 tryHit
L365 _onHitContact
L437 _playHitEffects
L473 cancelPendingHit
L484 destroy

## src/systems/SaveSystem.js (12 KB, 384 baris)
L31 class SaveSystemClass
L32 constructor
L37 _readRaw
L49 _writeRaw
L62 _removeRaw
L77 createDefaultState
L135 _sanitizeTilePosition
L158 _sanitizeMapPositions
L177 _isSupportedVersion
L184 hasSave
L205 load
L360 save
L378 clear
L383 SaveSystem

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

## src/systems/WorldBuilder.js (48 KB, 1555 baris)
L30 createSeededRng
L45 class WorldBuilder
L46 constructor
L64 build
L83 _track
L88 _createTilemapLayers
L118 _buildFarmValley
L313 _buildVillage
L404 _buildVillageNpcs
L418 _paintVillageDirt
L437 _paintVillageFootpaths
L497 _buildVillageBorder
L539 _buildVillagePlazaFence
L557 _buildVillageDeadEnd
L575 _buildVillageStructure
L606 _addVillageProp
L635 _buildVillageHouseGardens
L672 _buildVillageNature
L773 _addVillageTree
L789 _addVillageWildflowers
L815 _isVillageDecorFree
L827 _paintPathFringes
L850 _isPerimeterGateTile
L869 _addGateZones
L894 getGateAt
L909 _buildPlayerHouse
L992 _buildShippingAndShopArea
L1109 _buildWindmill
L1128 _populateNature
L1310 _ensureCroppedFrame
L1317 _addTileCollider
L1331 setResourceNodeActive
L1395 _addRectCollider
L1403 _addTileRectCollider
L1414 isFarmableTile
L1418 isWaterTile
L1422 isDirtTile
L1426 isTileBlocked
L1439 getNearbyLandmark
L1494 getNearbyNpc
L1514 updateLandmarkLabels
L1528 destroy

## src/ui/DialogueBox.js (10 KB, 324 baris)
L13 class DialogueBox
L14 constructor
L89 _now
L93 _fontPx
L98 _bodyStyle
L110 _continueStyle
L121 _open
L136 _startLine
L160 _typeNext
L182 _finishTyping
L189 _advance
L200 _close
L215 _stopTimer
L230 relayout
L283 _drawPanel
L303 destroy

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

## src/ui/UIStyle.js (20 KB, 664 baris)
L16 UI_STYLE
L35 drawWoodPanel
L95 floatingTextStyle
L117 class WoodLabelPanel
L118 constructor
L198 setPosition
L203 setDepth
L208 setMaxWidth
L219 setStyle
L247 setContent
L276 _redraw
L361 getSize
L365 show
L369 hide
L373 setVisible
L425 destroy
L451 class FloatingTextPool
L452 constructor
L505 spawn
L644 destroy
