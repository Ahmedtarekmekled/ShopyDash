import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertOctagon, Store, MessageSquareX } from "lucide-react";

export function CancelledOrdersAnalysis() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const startDate = date?.from ? date.from.toISOString() : undefined;
  const endDate = date?.to ? date.to.toISOString() : undefined;

  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['cancelled_orders_by_shop', startDate, endDate],
    queryFn: () => analyticsService.getCancelledOrdersByShop(startDate, endDate, 10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['cancelled_orders_details', startDate, endDate],
    queryFn: () => analyticsService.getCancelledOrdersDetails(startDate, endDate, 15),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6 mt-8">
      {/* Header section with Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t pt-8">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-destructive">
            <AlertOctagon className="w-5 h-5" />
            تحليل الطلبات الملغاة
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تحليل المتاجر الأكثر إلغاءً و أسباب الإلغاء الشائعة
          </p>
        </div>
        <div>
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Cancelled Stores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-600" />
              المتاجر الأعلى في نسبة الإلغاء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">الترتيب</TableHead>
                  <TableHead className="text-center">المتجر</TableHead>
                  <TableHead className="text-center">عدد الإلغاءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStores ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">جاري التحميل...</TableCell>
                  </TableRow>
                ) : stores && stores.length > 0 ? (
                  stores.map((store, index) => (
                    <TableRow key={store.shop_id}>
                      <TableCell className="text-center font-semibold text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {store.shop_name}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-bold">
                        {store.cancelled_count}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      لا يوجد إلغاءات في هذه الفترة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cancellation Details */}
        <Card className="md:col-span-1 border-destructive/20">
          <CardHeader className="pb-3 bg-red-50/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <MessageSquareX className="w-4 h-4" />
              أحدث تفاصيل الإلغاء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center">قام بالإلغاء</TableHead>
                  <TableHead className="text-center">المتجر</TableHead>
                  <TableHead className="text-center">السبب المكتوب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingDetails ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">جاري التحميل...</TableCell>
                  </TableRow>
                ) : details && details.length > 0 ? (
                  details.map((item, index) => (
                    <TableRow key={index} className="text-xs hover:bg-red-50/30">
                      <TableCell className="text-center">
                        <div className="font-semibold">{item.cancelled_by_name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {item.status.includes('BY_SHOP') ? 'المتجر' : item.status.includes('BY_CUSTOMER') ? 'العميل' : 'النظام'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.shop_name}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-medium max-w-[150px] truncate" title={item.reason}>
                        {item.reason}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      لا يوجد تفاصيل مسجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
