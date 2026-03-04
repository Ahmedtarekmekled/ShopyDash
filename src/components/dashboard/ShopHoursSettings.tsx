import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shopsService } from "@/services/catalog.service";
import { WorkingHours, Shop } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { Loader2, Save, Clock, AlertTriangle, Plus, Trash2, Moon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShopHoursSettingsProps {
  shop: Shop;
}

const DAYS = [
  { id: 0, label: "الأحد" },
  { id: 1, label: "الاثنين" },
  { id: 2, label: "الثلاثاء" },
  { id: 3, label: "الأربعاء" },
  { id: 4, label: "الخميس" },
  { id: 5, label: "الجمعة" },
  { id: 6, label: "السبت" },
];

export function ShopHoursSettings({ shop }: ShopHoursSettingsProps) {
  const queryClient = useQueryClient();
  const [statusOverride, setStatusOverride] = useState(shop.override_mode);
  const [hoursState, setHoursState] = useState<Partial<WorkingHours>[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setStatusOverride(shop.override_mode);
  }, [shop.override_mode]);

  const { data: hours, isLoading } = useQuery({
    queryKey: ["shop-hours", shop.id],
    queryFn: () => shopsService.getHours(shop.id),
  });

  useEffect(() => {
    if (hours) {
      // Load existing hours into state
      // If no hours exist for a day, we don't create them yet until user interacts, 
      // OR we can pre-fill empty enabled days if empty? 
      // Better: Keep exact DB state, but map over DAYS when rendering.
      // If a day has no records, we treat it as "Disabled" visually until toggled on.
      setHoursState(hours);
    }
  }, [hours]);

  const updateOverrideMutation = useMutation({
    mutationFn: async (mode: 'AUTO' | 'FORCE_OPEN' | 'FORCE_CLOSED') => {
      setStatusOverride(mode);
      await shopsService.updateOverride(shop.id, mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop", shop.slug] });
      queryClient.invalidateQueries({ queryKey: ["shop", "owner", shop.owner_id] });
      queryClient.invalidateQueries({ queryKey: ["shops"] }); 
      notify.success("تم تحديث حالة المتجر");
    },
    onError: () => {
      notify.error("حدث خطأ أثناء التحديث");
      setStatusOverride(shop.override_mode);
    },
  });

  const saveHoursMutation = useMutation({
    mutationFn: async (hoursToSave: Partial<WorkingHours>[]) => {
      await shopsService.updateHours(shop.id, hoursToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-hours", shop.id] });
      setHasChanges(false);
      notify.success("تم حفظ ساعات العمل");
    },
    onError: () => notify.error("حدث خطأ أثناء الحفظ"),
  });

  // Helper: Get shifts for a day
  const getShiftsForDay = (dayId: number) => {
    return hoursState
      .filter(h => h.day_of_week === dayId)
      .sort((a, b) => (a.period_index || 0) - (b.period_index || 0));
  };

  // Helper: Check if day is enabled (has at least one enabled shift)
  const isDayEnabled = (dayId: number) => {
    const shifts = getShiftsForDay(dayId);
    return shifts.length > 0 && shifts.some(s => s.is_enabled);
  };

  // Action: Toggle Day
  const handleToggleDay = (dayId: number, enabled: boolean) => {
    setHoursState(prev => {
      const existingShifts = prev.filter(h => h.day_of_week === dayId);
      
      if (enabled) {
        // Enable: If no shifts exist, create default Period 1
        if (existingShifts.length === 0) {
          return [...prev, {
            shop_id: shop.id,
            day_of_week: dayId,
            period_index: 1,
            is_enabled: true,
            start_time: "09:00",
            end_time: "22:00",
            crosses_midnight: false
          }];
        }
        // If shifts exist, make sure at least one is enabled
        return prev.map(h => h.day_of_week === dayId ? { ...h, is_enabled: true } : h);
      } else {
        // Disable: Mark all shifts as disabled
        return prev.map(h => h.day_of_week === dayId ? { ...h, is_enabled: false } : h);
      }
    });
    setHasChanges(true);
  };

  // Action: Update Shift Time
  const handleTimeChange = (dayId: number, periodIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setHoursState(prev => prev.map(h => {
      if (h.day_of_week === dayId && h.period_index === periodIndex) {
        const updated = { ...h, [field]: value };
        
        // Auto-detect midnight crossing
        if (updated.start_time && updated.end_time) {
          const [startH, startM] = updated.start_time.split(':').map(Number);
          const [endH, endM] = updated.end_time.split(':').map(Number);
          
          updated.crosses_midnight = (endH < startH) || (endH === startH && endM < startM);
        }
        return updated;
      }
      return h;
    }));
    setHasChanges(true);
  };

  // Action: Add Shift
  const handleAddShift = (dayId: number) => {
    const shifts = getShiftsForDay(dayId);
    if (shifts.length >= 2) return;

    setHoursState(prev => [...prev, {
      shop_id: shop.id,
      day_of_week: dayId,
      period_index: 2,
      is_enabled: true,
      start_time: "17:00",
      end_time: "23:00",
      crosses_midnight: false
    }]);
    setHasChanges(true);
  };

  // Action: Remove Shift
  const handleRemoveShift = (dayId: number, periodIndex: number) => {
    setHoursState(prev => prev.filter(h => !(h.day_of_week === dayId && h.period_index === periodIndex)));
    setHasChanges(true);
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>;

  return (
    <div className="space-y-8">
      {/* 1. Status Override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            التحكم السريع بالحالة
          </CardTitle>
          <CardDescription>
            يمكنك إجبار المتجر على الفتح أو الإغلاق بغض النظر عن الجدول الزمني.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-4">
                <Button 
                    variant={statusOverride === 'AUTO' ? "default" : "outline"}
                    onClick={() => updateOverrideMutation.mutate('AUTO')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'AUTO'}
                >
                    تلقائي (حسب الجدول)
                </Button>
                <Button 
                    variant={statusOverride === 'FORCE_OPEN' ? "default" : "outline"}
                    className={statusOverride === 'FORCE_OPEN' ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => updateOverrideMutation.mutate('FORCE_OPEN')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'FORCE_OPEN'}
                >
                    مفتوح دائماً (مجبر)
                </Button>
                <Button 
                    variant={statusOverride === 'FORCE_CLOSED' ? "destructive" : "outline"}
                    onClick={() => updateOverrideMutation.mutate('FORCE_CLOSED')}
                    disabled={updateOverrideMutation.isPending && statusOverride !== 'FORCE_CLOSED'}
                >
                    مغلق مؤقتاً (مجبر)
                </Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
                الحالة الحالية: <span className="font-bold text-foreground">
                    {statusOverride === 'AUTO' ? "تلقائي" : 
                     statusOverride === 'FORCE_OPEN' ? "مفتوح يدوياً" : "مغلق يدوياً"}
                </span>
            </div>
        </CardContent>
      </Card>

      {/* 2. Schedule Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            جدول العمل الأسبوعي (نظام الورديات)
          </CardTitle>
          <CardDescription>
            يمكنك إضافة فترتين لكل يوم. يدعم النظام العمل بعد منتصف الليل.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Accordion type="single" collapsible className="w-full">
                {DAYS.map(day => {
                    const shifts = getShiftsForDay(day.id);
                    const enabled = isDayEnabled(day.id);

                    return (
                        <AccordionItem key={day.id} value={`day-${day.id}`}>
                            <div className="flex items-center">
                              <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                                <Switch 
                                    checked={enabled}
                                    onCheckedChange={(checked) => handleToggleDay(day.id, checked)}
                                />
                              </div>
                              <AccordionTrigger className="hover:no-underline flex-1">
                                <div className="flex items-center gap-3 w-full">
                                    <span className="font-medium min-w-[60px] text-right">{day.label}</span>
                                    <span className={`text-xs ${enabled ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                                        {enabled ? 
                                          (shifts.length > 1 ? "فترتان" : "متاح") 
                                          : "مغلق"}
                                    </span>
                                </div>
                              </AccordionTrigger>
                            </div>
                            <AccordionContent className="px-1 pt-2 pb-4 space-y-4">
                                {enabled && (
                                  <>
                                    {shifts.map((shift, index) => (
                                        <div key={index} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold uppercase text-muted-foreground">
                                                    الفترة {shift.period_index}
                                                </span>
                                                {shift.period_index === 2 && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveShift(day.id, shift.period_index!)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">من</Label>
                                                    <Input 
                                                        type="time" 
                                                        value={shift.start_time || ""} 
                                                        onChange={(e) => handleTimeChange(day.id, shift.period_index!, 'start_time', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">إلى</Label>
                                                    <Input 
                                                        type="time" 
                                                        value={shift.end_time || ""} 
                                                        onChange={(e) => handleTimeChange(day.id, shift.period_index!, 'end_time', e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                            </div>

                                            {shift.crosses_midnight && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        <Moon className="w-3 h-3 mr-1" />
                                                        يمتد لليوم التالي
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {shifts.length < 2 && (
                                        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => handleAddShift(day.id)}>
                                            <Plus className="w-3 h-3 mr-2" />
                                            إضافة فترة ثانية
                                        </Button>
                                    )}
                                  </>
                                )}
                                {!enabled && (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                        المتجر مغلق في يوم {day.label}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
             </Accordion>

             <div className="mt-6 flex justify-end sticky bottom-0 bg-background pt-4 border-t">
                <Button 
                    onClick={() => saveHoursMutation.mutate(hoursState)} 
                    disabled={!hasChanges || saveHoursMutation.isPending}
                    className="gap-2 w-full sm:w-auto"
                >
                    {saveHoursMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                    حفظ التغييرات
                </Button>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
