import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService, TopCustomerMetric } from "@/services/analytics.service";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Package, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export function TopCustomers() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const startDate = date?.from ? date.from.toISOString() : undefined;
  const endDate = date?.to ? date.to.toISOString() : undefined;

  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ['top_customers', startDate, endDate],
    queryFn: () => analyticsService.getTopCustomers(startDate, endDate, 50),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            العملاء الأكثر طلباً
          </h2>
          <p className="text-muted-foreground text-sm">أفضل 50 عميل في المنصة حسب عدد الطلبات المكتملة</p>
        </div>
        <div>
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-center">الترتيب</TableHead>
                <TableHead className="text-center">العميل</TableHead>
                <TableHead className="text-center">الهاتف</TableHead>
                <TableHead className="text-center">إجمالي الطلبات</TableHead>
                <TableHead className="text-center">إجمالي المدفوعات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    جاري تحميل البيانات...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive h-24">
                    حدث خطأ أثناء تحميل البيانات
                  </TableCell>
                </TableRow>
              ) : customers && customers.length > 0 ? (
                customers.map((customer, index) => (
                  <TableRow key={customer.user_id}>
                    <TableCell className="text-center font-bold">
                      {index === 0 ? <Crown className="w-5 h-5 text-amber-500 mx-auto" /> :
                       index === 1 ? <Crown className="w-5 h-5 text-slate-400 mx-auto" /> :
                       index === 2 ? <Crown className="w-5 h-5 text-amber-700 mx-auto" /> : 
                       `#${index + 1}`}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{customer.customer_name || 'غير متوفر'}</TableCell>
                    <TableCell dir="ltr" className="text-center">{customer.customer_phone || 'غير متوفر'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="px-3">
                        <Package className="w-3 h-3 mr-1" />
                        {customer.total_orders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-primary font-bold">
                      {formatPrice(customer.total_spent)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    لا يوجد عملاء في هذه الفترة المحددة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
