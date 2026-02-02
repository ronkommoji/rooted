export interface DailyDevotionalCompletionEvent {
  date: string;
  userId: string;
  groupId: string;
  completion: {
    scripture_completed: boolean;
    devotional_completed: boolean;
    prayer_completed: boolean;
  };
  allCompleted: boolean;
}

type CompletionListener = (event: DailyDevotionalCompletionEvent) => void;

const completionListeners = new Set<CompletionListener>();

export const subscribeDailyDevotionalCompletion = (listener: CompletionListener) => {
  completionListeners.add(listener);
  return () => {
    completionListeners.delete(listener);
  };
};

export const notifyDailyDevotionalCompletion = (event: DailyDevotionalCompletionEvent) => {
  completionListeners.forEach((listener) => listener(event));
};
