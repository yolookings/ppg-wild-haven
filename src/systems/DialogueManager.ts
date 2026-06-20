// src/systems/DialogueManager.ts
import { DialogueStep } from './QuestManager';
import { EventBus } from './EventBus';

export class DialogueManager {
  private static active = false;
  private static steps: DialogueStep[] = [];
  private static currentIndex = 0;
  private static isTyping = false;
  private static onCompleteCallback?: () => void;

  public static isDialogueActive(): boolean {
    return this.active;
  }

  public static startDialogue(steps: DialogueStep[], onComplete?: () => void): void {
    if (steps.length === 0) return;
    this.active = true;
    this.steps = steps;
    this.currentIndex = 0;
    this.isTyping = false;
    this.onCompleteCallback = onComplete;

    EventBus.emit('dialogueStarted', this.getCurrentStep());
  }

  public static getCurrentStep(): DialogueStep | undefined {
    if (!this.active || this.currentIndex >= this.steps.length) {
      return undefined;
    }
    return this.steps[this.currentIndex];
  }

  public static setTyping(typing: boolean): void {
    this.isTyping = typing;
  }

  public static getIsTyping(): boolean {
    return this.isTyping;
  }

  public static next(): void {
    if (!this.active) return;

    if (this.isTyping) {
      // If typing, trigger immediate complete event
      this.isTyping = false;
      EventBus.emit('dialogueSkipTyping');
      return;
    }

    this.currentIndex++;
    if (this.currentIndex >= this.steps.length) {
      this.endDialogue();
    } else {
      EventBus.emit('dialogueNextStep', this.getCurrentStep());
    }
  }

  public static endDialogue(): void {
    this.active = false;
    this.steps = [];
    this.currentIndex = 0;
    this.isTyping = false;

    EventBus.emit('dialogueEnded');
    
    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = undefined;
      cb();
    }
  }
}
