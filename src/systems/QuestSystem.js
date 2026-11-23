/**
 * QuestSystem: aturan quest desa tanpa dependensi Phaser.
 *
 * - Status tersimpan hanya `aktif` / `selesai`; status `belum terbuka` dan
 *   `tersedia` dihitung dari hari + prasyarat (`requires`).
 * - Progres tidak disimpan: selalu dihitung dari jumlah item di inventory
 *   lewat callback `getItemCount`.
 * - Serah terima dilakukan lewat satu callback `performTrade(itemId, amount, coins)`
 *   yang mengubah inventory dan koin sekaligus, dan mengembalikan `{ ok }`.
 *   Jika gagal, status quest tidak berubah (tidak ada barang hilang tanpa hadiah).
 */
import { ITEMS } from '../data/items.js';
import {
  QUESTS,
  QUESTS_BY_ID,
  sanitizeQuestState,
} from '../data/quests.js';

export const QUEST_STATUS = Object.freeze({
  LOCKED: 'belum',
  AVAILABLE: 'tersedia',
  ACTIVE: 'aktif',
  DONE: 'selesai',
});

export const QUEST_INDICATOR = Object.freeze({
  AVAILABLE: 'available',
  READY: 'ready',
});

export class QuestSystem {
  constructor(gameState, options = {}) {
    this.gameState = gameState || {};
    this.getItemCount =
      typeof options.getItemCount === 'function' ? options.getItemCount : () => 0;
    this.getDay =
      typeof options.getDay === 'function'
        ? options.getDay
        : () => Math.max(1, Math.floor(Number(this.gameState.day) || 1));
    this.performTrade =
      typeof options.performTrade === 'function' ? options.performTrade : null;
    this.onChanged =
      typeof options.onChanged === 'function' ? options.onChanged : null;
    this.onCompleted =
      typeof options.onCompleted === 'function' ? options.onCompleted : null;

    // Save lama tanpa `quests` / entri rusak dibersihkan di sini juga agar
    // QuestSystem tetap aman walau dipakai tanpa SaveSystem.
    this.gameState.quests = sanitizeQuestState(this.gameState.quests);
    this._recentActiveId = this._findLatestActiveId();
    this._activeOrder = QUESTS.filter(
      (quest) => this._storedStatus(quest.id) === QUEST_STATUS.ACTIVE
    ).map((quest) => quest.id);
  }

  _day() {
    return Math.max(1, Math.floor(Number(this.getDay()) || 1));
  }

  _storedStatus(questId) {
    return this.gameState.quests?.[questId] || null;
  }

  _findLatestActiveId() {
    let latest = null;
    for (const quest of QUESTS) {
      if (this._storedStatus(quest.id) === QUEST_STATUS.ACTIVE) {
        latest = quest.id;
      }
    }
    return latest;
  }

  getQuest(questId) {
    return QUESTS_BY_ID[questId] || null;
  }

  /**
   * Status efektif: `belum` (belum terbuka), `tersedia`, `aktif`, atau `selesai`.
   */
  getStatus(questId) {
    const quest = this.getQuest(questId);
    if (!quest) return QUEST_STATUS.LOCKED;

    const stored = this._storedStatus(questId);
    if (stored === QUEST_STATUS.DONE || stored === QUEST_STATUS.ACTIVE) {
      return stored;
    }

    if (this._day() < quest.minDay) return QUEST_STATUS.LOCKED;
    for (const requiredId of quest.requires) {
      if (this.getStatus(requiredId) !== QUEST_STATUS.DONE) {
        return QUEST_STATUS.LOCKED;
      }
    }
    return QUEST_STATUS.AVAILABLE;
  }

  getProgress(questOrId) {
    const quest =
      typeof questOrId === 'string' ? this.getQuest(questOrId) : questOrId;
    if (!quest) return { have: 0, need: 0, complete: false, label: '' };

    const need = Math.max(1, Math.floor(Number(quest.amount) || 1));
    const have = Math.max(0, Math.floor(Number(this.getItemCount(quest.itemId)) || 0));
    const shown = Math.min(have, need);
    const itemName = ITEMS[quest.itemId]?.name || quest.itemId;
    return {
      have,
      need,
      shown,
      complete: have >= need,
      label: `${itemName} ${shown}/${need}`,
    };
  }

  /**
   * Quest yang relevan untuk satu NPC: yang sedang aktif lebih dulu,
   * lalu quest tersedia berikutnya sesuai urutan data.
   */
  getNpcQuest(npcId) {
    const npcQuests = QUESTS.filter((quest) => quest.npcId === npcId).sort(
      (a, b) => a.order - b.order
    );
    if (npcQuests.length === 0) return null;

    for (const quest of npcQuests) {
      if (this.getStatus(quest.id) === QUEST_STATUS.ACTIVE) return quest;
    }
    for (const quest of npcQuests) {
      if (this.getStatus(quest.id) === QUEST_STATUS.AVAILABLE) return quest;
    }
    return null;
  }

  /** `'available'` | `'ready'` | null untuk ikon melayang di atas NPC. */
  getNpcIndicator(npcId) {
    const quest = this.getNpcQuest(npcId);
    if (!quest) return null;

    const status = this.getStatus(quest.id);
    if (status === QUEST_STATUS.AVAILABLE) return QUEST_INDICATOR.AVAILABLE;
    if (status === QUEST_STATUS.ACTIVE && this.getProgress(quest).complete) {
      return QUEST_INDICATOR.READY;
    }
    return null;
  }

  /** Teks tracker HUD: quest aktif terbaru + progres, atau null. */
  getTrackerText() {
    const activeQuests = QUESTS.filter(
      (quest) => this.getStatus(quest.id) === QUEST_STATUS.ACTIVE
    );
    if (activeQuests.length === 0) return null;

    let quest = null;
    for (let i = this._activeOrder.length - 1; i >= 0; i -= 1) {
      const candidate = this.getQuest(this._activeOrder[i]);
      if (candidate && this.getStatus(candidate.id) === QUEST_STATUS.ACTIVE) {
        quest = candidate;
        break;
      }
    }
    if (!quest) quest = this.getQuest(this._recentActiveId);
    if (!quest) quest = activeQuests[activeQuests.length - 1];

    const progress = this.getProgress(quest);
    return `Quest: ${quest.title} ${progress.shown}/${progress.need}`;
  }

  /**
   * Dipanggil saat pemain bicara dengan NPC.
   * Hasil:
   * - `{ kind: 'none' }` -> pakai dialog umum yang sudah ada.
   * - `{ kind: 'offer', quest, lines }` -> quest baru diterima.
   * - `{ kind: 'reminder', quest, progress, lines }` -> barang belum cukup.
   * - `{ kind: 'done', quest, rewardCoins, lines }` -> serah terima berhasil.
   */
  talkTo(npcId) {
    if (!npcId) return { kind: 'none' };

    const quest = this.getNpcQuest(npcId);
    if (!quest) return { kind: 'none' };

    const status = this.getStatus(quest.id);
    if (status === QUEST_STATUS.AVAILABLE) {
      this.gameState.quests[quest.id] = QUEST_STATUS.ACTIVE;
      this._recentActiveId = quest.id;
      this._rememberActive(quest.id);
      this._notifyChanged();
      return {
        kind: 'offer',
        quest,
        lines: this._offerLines(quest),
      };
    }

    if (status !== QUEST_STATUS.ACTIVE) return { kind: 'none' };

    const progress = this.getProgress(quest);
    if (!progress.complete) {
      return {
        kind: 'reminder',
        quest,
        progress,
        lines: this._reminderLines(quest, progress),
      };
    }

    const rewardCoins = Math.max(0, Math.floor(Number(quest.rewardCoins) || 0));
    const trade =
      this.performTrade && this.performTrade(quest.itemId, quest.amount, rewardCoins);

    if (!trade || !trade.ok) {
      // Barang/koin tidak berubah; tetap tampilkan pengingat agar tidak macet.
      const safeProgress = this.getProgress(quest);
      return {
        kind: 'reminder',
        quest,
        progress: safeProgress,
        lines: this._reminderLines(quest, safeProgress),
      };
    }

    this.gameState.quests[quest.id] = QUEST_STATUS.DONE;
    this._forgetActive(quest.id);
    this._recentActiveId = this._lastActiveFromOrder();
    this._notifyChanged();
    if (this.onCompleted) {
      this.onCompleted({ quest, rewardCoins });
    }

    return {
      kind: 'done',
      quest,
      rewardCoins,
      lines: this._doneLines(quest, rewardCoins),
    };
  }

  _notifyChanged() {
    if (this.onChanged) this.onChanged();
  }

  _rememberActive(questId) {
    const index = this._activeOrder.indexOf(questId);
    if (index !== -1) this._activeOrder.splice(index, 1);
    this._activeOrder.push(questId);
  }

  _forgetActive(questId) {
    const index = this._activeOrder.indexOf(questId);
    if (index !== -1) this._activeOrder.splice(index, 1);
  }

  _lastActiveFromOrder() {
    for (let i = this._activeOrder.length - 1; i >= 0; i -= 1) {
      if (this._storedStatus(this._activeOrder[i]) === QUEST_STATUS.ACTIVE) {
        return this._activeOrder[i];
      }
    }
    return null;
  }

  _textLines(texts, prefix) {
    const list = Array.isArray(texts) ? texts : [texts];
    return list
      .filter((text) => typeof text === 'string' && text.trim())
      .map((text, index) => ({ id: `${prefix}_${index}`, text }));
  }

  _offerLines(quest) {
    const lines = this._textLines(quest.dialogue.offer, `${quest.id}_offer`);
    lines.push({
      id: `${quest.id}_offer_reward`,
      text: `${ITEMS[quest.itemId]?.name || 'Barang'} ${quest.amount} buah, ya. Hadiahnya ${quest.rewardCoins}G.`,
    });
    return lines;
  }

  _reminderLines(quest, progress) {
    return [
      {
        id: `${quest.id}_reminder`,
        text: `${quest.dialogue.reminder} (${progress.label})`,
      },
    ];
  }

  _doneLines(quest, rewardCoins) {
    const lines = this._textLines(quest.dialogue.done, `${quest.id}_done`);
    lines.push({
      id: `${quest.id}_done_reward`,
      text: `Hadiah ${rewardCoins}G sudah masuk ke kantongmu.`,
    });
    return lines;
  }
}