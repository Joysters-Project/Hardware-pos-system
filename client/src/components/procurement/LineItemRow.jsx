import { Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductSearchSelect } from './ProductSearchSelect';

export function LineItemRow({
  index,
  products,
  field,
  onProductSelect,
  onUpdateQuantity,
  onRemove,
  errors,
}) {
  const lineTotal = (field.quantity || 0) * (field.cost_price || 0);

  return (
    <tr className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-6 relative">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
            {index + 1}
          </span>
          <ProductSearchSelect
            products={products}
            value={field.product_id}
            onSelect={(productId, product) => onProductSelect(index, productId, product)}
            placeholder="Select product..."
          />
        </div>
        {errors?.product_id && (
          <p className="text-xs text-red-500 mt-1 ml-8">Product is required</p>
        )}
      </td>

      <td className="py-3 px-6 text-center">
        <Input
          type="number"
          min="1"
          value={field.quantity || ''}
          onChange={(e) => onUpdateQuantity(index, parseInt(e.target.value) || 1)}
          className="w-20 text-center mx-auto"
          placeholder="Qty"
        />
        {errors?.quantity && (
          <p className="text-xs text-red-500 mt-1">Min: 1</p>
        )}
      </td>

      <td className="py-3 px-6 text-right">
        <div className="flex items-center justify-end gap-1">
          <span className="text-slate-500">LKR</span>
          <span className="font-mono text-slate-700">
            {field.cost_price ? Number(field.cost_price).toFixed(2) : '0.00'}
          </span>
        </div>
      </td>

      <td className="py-3 px-6 text-right">
        <div className="flex items-center justify-end gap-1 font-semibold text-slate-800">
          <span className="text-slate-500">LKR</span>
          <span className="font-mono">{lineTotal.toFixed(2)}</span>
        </div>
      </td>

      <td className="py-3 px-6 text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

export default LineItemRow;
