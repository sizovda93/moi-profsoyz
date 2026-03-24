import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  pending: number;
  totalEarned: number;
}

export function BalanceCard({ balance, pending, totalEarned }: BalanceCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Доступно к выводу</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(balance)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">В обработке</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(pending)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Всего заработано</p>
              <p className="text-2xl font-semibold mt-1">{formatCurrency(totalEarned)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
