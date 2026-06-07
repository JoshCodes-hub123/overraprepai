import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/hooks/useSendNotification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Lock, Loader2, CheckCircle2, Sparkles } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  token_cost: number;
  tutor_id: string | null;
  question_count?: number;
  duration_minutes?: number;
  course?: {
    code: string;
    name: string;
  };
}

interface PurchaseQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  walletBalance: number;
  onSuccess: () => void;
}

export const PurchaseQuizDialog = ({
  open,
  onOpenChange,
  quiz,
  walletBalance,
  onSuccess,
}: PurchaseQuizDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const hasEnoughBalance = walletBalance >= (quiz?.token_cost || 0);

  const handlePurchase = async () => {
    if (!user || !quiz) return;

    setIsPurchasing(true);

    try {
      // 1. Get the current wallet
      const { data: wallet, error: walletError } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw walletError;

      if (wallet.balance < quiz.token_cost) {
        toast({
          variant: "destructive",
          title: "Insufficient tokens",
          description: "You don't have enough tokens for this quiz.",
        });
        return;
      }

      // 2. Get commission rate from platform settings
      const { data: commissionSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "tutor_commission_rate")
        .single();

      const tutorCommissionRate = commissionSetting ? parseInt(commissionSetting.value) : 80;
      const tutorShare = Math.floor((quiz.token_cost * tutorCommissionRate) / 100);
      const platformShare = quiz.token_cost - tutorShare;

      // 3. Deduct tokens from student wallet
      const { error: deductError } = await supabase
        .from("token_wallets")
        .update({
          balance: wallet.balance - quiz.token_cost,
          total_spent: (wallet.total_spent || 0) + quiz.token_cost,
        })
        .eq("id", wallet.id);

      if (deductError) throw deductError;

      // 4. Record the purchase
      const { error: purchaseError } = await supabase
        .from("student_quiz_purchases")
        .insert({
          student_id: user.id,
          quiz_id: quiz.id,
          tokens_spent: quiz.token_cost,
        });

      if (purchaseError) throw purchaseError;

      // 5. Record student transaction
      const { error: transactionError } = await supabase
        .from("token_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: -quiz.token_cost,
          type: "purchase",
          description: `Purchased quiz: ${quiz.title}`,
          reference_id: quiz.id,
        });

      if (transactionError) throw transactionError;

      // 6. If there's a tutor, credit their wallet and record earnings
      if (quiz.tutor_id && tutorShare > 0) {
        // Get or create tutor wallet
        let { data: tutorWallet } = await supabase
          .from("token_wallets")
          .select("*")
          .eq("user_id", quiz.tutor_id)
          .single();

        if (tutorWallet) {
          // Update tutor wallet
          await supabase
            .from("token_wallets")
            .update({
              balance: tutorWallet.balance + tutorShare,
              total_earned: (tutorWallet.total_earned || 0) + tutorShare,
            })
            .eq("id", tutorWallet.id);

          // Record tutor transaction
          await supabase.from("token_transactions").insert({
            wallet_id: tutorWallet.id,
            amount: tutorShare,
            type: "earning",
            description: `Earned from quiz: ${quiz.title}`,
            reference_id: quiz.id,
          });
        }

        // 7. Record tutor earnings
        await supabase.from("tutor_earnings").insert({
          tutor_id: quiz.tutor_id,
          student_id: user.id,
          quiz_id: quiz.id,
          tokens_paid: quiz.token_cost,
          tutor_share: tutorShare,
          platform_share: platformShare,
        });
      }

      // Send email notification to the student (use the verified auth email)
      const studentEmail = user.email;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (studentEmail) {
        await sendNotification({
          type: "quiz_purchased",
          to: studentEmail,
          data: {
            studentName: profile?.full_name || "Student",
            quizTitle: quiz.title,
            courseName: quiz.course?.name || "N/A",
            questionCount: quiz.question_count || 20,
            duration: quiz.duration_minutes || 30,
            tokensSpent: quiz.token_cost,
            dashboardUrl: `${window.location.origin}/student/dashboard`,
          },
        });
      }

      toast({
        title: "Quiz purchased!",
        description: `You can now access "${quiz.title}". ${quiz.token_cost} tokens deducted.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error purchasing quiz:", error);
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message || "Failed to purchase quiz. Please try again.",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            Unlock Premium Quiz
          </DialogTitle>
          <DialogDescription>
            Purchase this quiz to get unlimited access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quiz Info */}
          <div className="bg-muted/50 rounded-xl p-4">
            {quiz.course && (
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded mb-2 inline-block">
                {quiz.course.code}
              </span>
            )}
            <h3 className="font-display font-semibold text-foreground mb-1">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between p-4 bg-accent/10 rounded-xl">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-accent" />
              <span className="font-medium text-foreground">Quiz Price</span>
            </div>
            <span className="font-display text-xl font-bold text-accent">
              {quiz.token_cost} tokens
            </span>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <span className="text-muted-foreground">Your Balance</span>
            <span className={`font-semibold ${hasEnoughBalance ? "text-foreground" : "text-destructive"}`}>
              {walletBalance} tokens
            </span>
          </div>

          {!hasEnoughBalance && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              You need {quiz.token_cost - walletBalance} more tokens to purchase this quiz.
            </div>
          )}

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">What you get:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Unlimited access to this quiz
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Practice mode with instant feedback
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success" />
                CBT simulation mode
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-accent" />
                AI-powered explanations
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            onClick={handlePurchase}
            disabled={!hasEnoughBalance || isPurchasing}
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Unlock Quiz
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
