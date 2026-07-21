import React, { useState } from 'react';
import { useListPricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useListPricingRules();
  const createRule = useCreatePricingRule();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'base_fee',
    value: '',
    description: ''
  });

  const handleCreate = async () => {
    try {
      await createRule.mutateAsync({
        data: {
          ...formData,
          value: Number(formData.value),
          isActive: true
        }
      });
      setIsAddOpen(false);
      setFormData({ name: '', ruleType: 'base_fee', value: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-rules'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (id: number, currentActive: boolean) => {
    try {
      await updateRule.mutateAsync({
        id,
        data: { isActive: !currentActive }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-rules'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      await deleteRule.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ['/api/pricing-rules'] });
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'base_fee': '基本料金',
      'per_km': '距離単価 (km)',
      'vehicle_surcharge': '車両割増',
      'urgency_surcharge': '特急料金',
      'time_surcharge': '時間指定',
      'special_handling': '特殊取扱'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">料金設定</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              ルール追加
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>料金ルールの追加</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>ルール名</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="例: 関東圏 基本料金" 
                />
              </div>
              <div className="space-y-2">
                <Label>種別</Label>
                <Select 
                  value={formData.ruleType}
                  onValueChange={val => setFormData({...formData, ruleType: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base_fee">基本料金</SelectItem>
                    <SelectItem value="per_km">距離単価 (km)</SelectItem>
                    <SelectItem value="vehicle_surcharge">車両割増 (倍率または固定額)</SelectItem>
                    <SelectItem value="urgency_surcharge">特急料金</SelectItem>
                    <SelectItem value="time_surcharge">時間指定料金</SelectItem>
                    <SelectItem value="special_handling">特殊取扱</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>設定値</Label>
                <Input 
                  type="number"
                  value={formData.value} 
                  onChange={e => setFormData({...formData, value: e.target.value})} 
                  placeholder="15000" 
                />
              </div>
              <div className="space-y-2">
                <Label>説明・条件</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="距離が50km以内の場合" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={createRule.isPending || !formData.name || !formData.value}>
                {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                登録する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">ルール名</th>
                <th className="px-6 py-4 font-medium">種別</th>
                <th className="px-6 py-4 font-medium">設定値</th>
                <th className="px-6 py-4 font-medium">説明</th>
                <th className="px-6 py-4 font-medium">状態</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : rules?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    ルールが設定されていません
                  </td>
                </tr>
              ) : (
                rules?.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{rule.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs border border-border bg-muted/50 text-muted-foreground">
                        {getTypeLabel(rule.ruleType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold font-mono">
                      {rule.value}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {rule.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Switch 
                        checked={rule.isActive} 
                        onCheckedChange={() => handleToggle(rule.id, !!rule.isActive)}
                        disabled={updateRule.isPending}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
