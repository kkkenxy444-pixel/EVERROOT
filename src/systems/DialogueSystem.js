import { DIALOGUE } from '../data/gameConfig.js';
import { NPC_DIALOGUES, pickDialogueLines } from '../data/dialogues.js';
import { eventBus, EVENTS } from './EventBus.js';

/**
 * Mengelola state percakapan NPC (data-driven, tanpa Phaser di dalam kelas ini):
 * memilih 2 kalimat yang memenuhi syarat cuaca/fase/hari, menghindari kalimat
 * terakhir yang sama, lalu memancarkan event untuk UIScene.
 *
 * GameScene menanggung pause waktu & kunci gerak lewat event
 * `DIALOGUE_STARTED` / `DIALOGUE_ENDED`.
 */
export class DialogueSystem {
  constructor({ getContext } = {}) {
    this.getContext = typeof getContext === 'function' ? getContext : () => ({});
    this.isActive = false;
    this.npc = null;
    this.lines = [];
    this.index = 0;
    this._lastLineIdByNpc = new Map();
  }

  start(npc) {
    if (this.isActive || !npc) return false;
    const data = NPC_DIALOGUES[npc.dialogueId];
    if (!data || !Array.isArray(data.lines) || data.lines.length === 0) {
      return false;
    }

    const picked = pickDialogueLines(
      data.lines,
      this.getContext(),
      this._lastLineIdByNpc.get(npc.id) || null,
      DIALOGUE.LINES_PER_TALK
    );
    if (picked.length === 0) return false;

    this.isActive = true;
    this.npc = npc;
    this.lines = picked;
    this.index = 0;
    this._lastLineIdByNpc.set(npc.id, picked[picked.length - 1].id);

    eventBus.emit(EVENTS.DIALOGUE_STARTED, {
      npcId: npc.id,
      name: npc.name,
      total: picked.length,
    });
    this._emitCurrentLine();
    return true;
  }

  advance() {
    if (!this.isActive) return false;
    if (this.index + 1 < this.lines.length) {
      this.index += 1;
      this._emitCurrentLine();
      return true;
    }
    this.close();
    return false;
  }

  close() {
    if (!this.isActive) return;
    const npcId = this.npc?.id || null;
    this.isActive = false;
    this.npc = null;
    this.lines = [];
    this.index = 0;
    eventBus.emit(EVENTS.DIALOGUE_ENDED, { npcId });
  }

  destroy() {
    this.close();
    this._lastLineIdByNpc.clear();
    this.getContext = () => ({});
  }

  _emitCurrentLine() {
    const line = this.lines[this.index];
    if (!line) return;
    eventBus.emit(EVENTS.DIALOGUE_LINE, {
      npcId: this.npc?.id || null,
      text: line.text,
      lineId: line.id,
      index: this.index,
      total: this.lines.length,
    });
  }
}
