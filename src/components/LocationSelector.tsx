import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notify";
import {
  MapPin,
  Navigation,
  Home,
  Briefcase,
  Star,
  Plus,
  Check,
  ChevronDown,
  Loader2,
  MapPinOff,
  Map,
  Edit, // Added Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatPrice } from "@/lib/utils";
import { useAuth } from "@/store";
import {
  addressesService,
  regionsService,
  type AddressWithDistrict,
} from "@/services";
import { AddressFormDialog } from "@/components/address/AddressFormDialog"; // Added AddressFormDialog
import type { Region, District } from "@/types/database";
import {
  MapLocationPicker,
  LocationPreviewMap,
  type GeoCoordinates,
} from "./MapLocationPicker";

// Label icons mapping
const LABEL_ICONS: Record<string, React.ElementType> = {
  المنزل: Home,
  العمل: Briefcase,
  default: Star,
};

const PRESET_LABELS = ["المنزل", "العمل", "آخر"];

// GPS Location types
interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface LocationSelectorProps {
  value?: {
    address: string;
    districtId?: string | null;
    phone?: string;
    lat?: number;
    lng?: number;
  };
  onChange: (data: {
    address: string;
    districtId: string | null;
    deliveryFee: number;
    phone?: string;
    lat?: number;
    lng?: number;
  }) => void;
  className?: string;
  disabled?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  className,
  disabled,
}: LocationSelectorProps) {
  const { isAuthenticated, user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<AddressWithDistrict[]>(
    []
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [manualAddress, setManualAddress] = useState(value?.address || "");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GeoLocation | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<AddressWithDistrict | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<GeoCoordinates | null>(
      value?.lat && value?.lng
        ? { lat: value.lat, lng: value.lng }
        : null
    );

  // Load initial data
  useEffect(() => {
    loadRegions();
    if (isAuthenticated && user?.id) {
      loadSavedAddresses();
    }
  }, [isAuthenticated, user?.id]);

  // Load districts when region changes
  useEffect(() => {
    if (selectedRegionId) {
      loadDistricts(selectedRegionId);
    } else {
      setDistricts([]);
    }
  }, [selectedRegionId]);

  // Update parent when selection changes
  useEffect(() => {
    const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);
    onChange({
      address: manualAddress,
      districtId: selectedDistrictId || null,
      deliveryFee: selectedDistrict?.delivery_fee || 0,
      phone: value?.phone,
      lat: selectedCoordinates?.lat,
      lng: selectedCoordinates?.lng,
    });
  }, [manualAddress, selectedDistrictId, selectedCoordinates]);

  const loadRegions = async () => {
    try {
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
    }
  };

  const loadDistricts = async (regionId: string) => {
    try {
      const data = await regionsService.getDistricts(regionId);
      setDistricts(data);
    } catch (error) {
      console.error("Failed to load districts:", error);
    }
  };

  const loadSavedAddresses = async () => {
    if (!user?.id) return;
    setIsLoadingAddresses(true);
    try {
      const data = await addressesService.getByUser(user.id);

      setSavedAddresses(data);
      // Auto-select default address
      const defaultAddress = data.find((a) => a.is_default);
      if (defaultAddress && !value?.address) {
        selectSavedAddress(defaultAddress);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const selectSavedAddress = (address: AddressWithDistrict) => {
    setSelectedAddressId(address.id);
    setManualAddress(address.address);
    if (address.district?.region_id) {
      setSelectedRegionId(address.district.region_id);
    }
    if (address.district_id) {
      setSelectedDistrictId(address.district_id);
    }
    
    // Set coordinates if available in saved address
    if (address.latitude && address.longitude) {

      setSelectedCoordinates({
        lat: address.latitude,
        lng: address.longitude
      });
    } else {

      // Ensure we clear previous coordinates if switching to an address without them
      setSelectedCoordinates(null);
      notify.warning("هذا العنوان لا يحتوي على إحداثيات GPS. يرجى تحديث الموقع من الخريطة لحساب رسوم التوصيل بدقة.");
    }

    onChange({
      address: address.address,
      districtId: address.district_id,
      deliveryFee: address.district?.delivery_fee || 0,
      phone: address.phone || value?.phone,
      lat: address.latitude || undefined,
      lng: address.longitude || undefined,
    });

  };

  const handleMapLocationSelect = useCallback((coordinates: GeoCoordinates) => {
    // When returning from map, we want to open the dialog again with these coords
    // We assume we were adding/editing an address.
    // Since we closed the dialog to show the map, we need to restore the state.
    // For simplicity, we just set the editing address with new coordinates and re-open.
    
    // Construct a temporary address object with the new coordinates
    const newAddressPart = {
      // address: `موقع GPS: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, // Removed auto-fill
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      label: editingAddress?.label || "المنزل",
      is_default: editingAddress?.is_default || false,
      // Preserve other fields if possible, but map pick usually implies new location
    } as AddressWithDistrict;

    setEditingAddress((prev) => ({
       ...prev, 
       ...newAddressPart,
       // Merge existing text if it wasn't just GPS
       address: prev?.address ? prev.address : newAddressPart.address 
    } as AddressWithDistrict));
    
    // Re-open dialog
    setShowMapPicker(false);
    setShowAddDialog(true);
    notify.success("تم تحديد الموقع بنجاح");
  }, [editingAddress]);

  const getLabelIcon = (label: string) => {
    const Icon = LABEL_ICONS[label] || LABEL_ICONS.default;
    return Icon;
  };

  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  return (
    <div className={cn("space-y-4", className)}>
      
      {/* Map Picker Modal - Controlled by parent */}
      <MapLocationPicker
        open={showMapPicker}
        onClose={() => {
            setShowMapPicker(false);
            setShowAddDialog(true); // Re-open dialog on cancel
        }}
        onLocationSelect={handleMapLocationSelect}
        initialPosition={selectedCoordinates || undefined}
        // Pass the selected region's boundary
        regionBoundary={
             editingAddress?.district?.region?.boundary_coordinates || 
             regions.find(r => r.id === editingAddress?.district?.region_id)?.boundary_coordinates ||
             undefined
        }
        regionName={
             editingAddress?.district?.region?.name ||
             regions.find(r => r.id === editingAddress?.district?.region_id)?.name ||
             undefined
        }
      />

      {/* Saved Addresses (Expanded by default or if available) */}
      {isAuthenticated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">العناوين المحفوظة</Label>
          </div>

          <div className="grid gap-2">
            {savedAddresses.map((address) => {
              const Icon = getLabelIcon(address.label);
              return (
                <div
                  key={address.id}
                  className={cn(
                    "relative flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:bg-accent/50",
                    selectedAddressId === address.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => selectSavedAddress(address)}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      selectedAddressId === address.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{address.label}</span>
                      {address.is_default && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          افتراضي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {address.address}
                    </p>
                    {address.district && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {address.district.name}
                      </p>
                    )}
                  </div>
                  
                  {/* Edit Button */}
                  <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary z-10"
                      onClick={(e) => {
                          e.stopPropagation(); // Prevent selection
                          setEditingAddress(address);
                          setShowAddDialog(true);
                      }}
                  >
                      <Edit className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                  setEditingAddress(null);
                  setShowAddDialog(true);
              }}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة عنوان جديد
            </Button>
          </div>
        </div>
      )}



      {/* Add/Edit Address Dialog */}
      <AddressFormDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingAddress(null);
        }}
        address={editingAddress}
        regions={regions}
        userId={user?.id || ""}
        onSave={async () => {
          setShowAddDialog(false);
          setEditingAddress(null);
          await loadSavedAddresses();
        }}
        onShowMap={(selectedRegionId: string | undefined) => {
            setShowAddDialog(false); // Close dialog to show map
            // Update editingAddress with the selected region so the map knows boundaries
            if (selectedRegionId) {
                const region = regions.find(r => r.id === selectedRegionId);
                if (region) {
                    setEditingAddress(prev => {
                        const base = prev || { 
                             id: "", user_id: user?.id || "", label: "المنزل", address: "", 
                             is_default: false, created_at: "", updated_at: "" 
                        } as AddressWithDistrict;
                        
                        return {
                            ...base,
                            district: { 
                                 ...(base.district || {}), 
                                 region_id: selectedRegionId,
                                 region: region
                            } as any
                        };
                    });
                }
            }
            setShowMapPicker(true);
        }}
      />
    </div>
  );
}

// Export types for use in other components
export type { GeoLocation, AddressWithDistrict };
