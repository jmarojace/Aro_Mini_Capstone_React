<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Product;
use App\Models\RestockRequest;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function categories()
    {
        return Category::withCount('products')->orderBy('name')->get();
    }

    public function saveCategory(Request $r, ?Category $category = null)
    {
        $d = $r->validate(['name' => 'required|string|max:120|unique:categories,name,'.($category?->id ?? 'NULL'), 'description' => 'nullable|string']);
        $category ??= new Category;
        $category->fill($d)->save();

        return response()->json($category, $category->wasRecentlyCreated ? 201 : 200);
    }

    public function deleteCategory(Category $category)
    {
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    public function products(Request $r)
    {
        $q = Product::with(['category', 'inventory'])->where('active', true);
        if ($s = $r->query('search')) {
            $q->where(fn ($x) => $x->where('name', 'like', "%$s%")->orWhere('sku', 'like', "%$s%"));
        } if ($r->filled('category_id')) {
            $q->where('category_id', $r->integer('category_id'));
        } if ($r->query('status') === 'out') {
            $q->whereHas('inventory', fn ($x) => $x->where('stock_quantity', 0));
        } elseif ($r->query('status') === 'low') {
            $q->whereHas('inventory', fn ($x) => $x->whereColumn('stock_quantity', '<=', 'reorder_level')->where('stock_quantity', '>', 0));
        } elseif ($r->query('status') === 'in') {
            $q->whereHas('inventory', fn ($x) => $x->whereColumn('stock_quantity', '>', 'reorder_level'));
        }

        return $q->orderBy('name')->paginate(min($r->integer('per_page', 12), 100));
    }

    public function saveProduct(Request $r, ?Product $product = null)
    {
        $d = $r->validate(['category_id' => 'nullable|exists:categories,id', 'name' => 'required|string|max:180', 'sku' => 'required|string|max:80|unique:products,sku,'.($product?->id ?? 'NULL'), 'description' => 'nullable|string', 'image_url' => 'nullable|url|max:2048', 'image' => 'nullable|image|max:2048', 'price' => 'required|numeric|min:0', 'reorder_level' => 'sometimes|integer|min:0']);
        $image = $r->file('image');
        unset($d['image']);
        $level = $d['reorder_level'] ?? 5;
        unset($d['reorder_level']);
        $product ??= new Product;
        $oldImage = $product->image_url;
        if ($image) {
            $d['image_url'] = Storage::disk('public')->url($image->storePublicly('products', 'public'));
        }
        $product->fill($d)->save();
        if ($image && $oldImage) {
            $oldPath = parse_url($oldImage, PHP_URL_PATH);
            if ($oldPath && str_starts_with($oldPath, '/storage/products/')) {
                Storage::disk('public')->delete(substr($oldPath, strlen('/storage/')));
            }
        }
        InventoryItem::firstOrCreate(['product_id' => $product->id], ['reorder_level' => $level]);
        if (isset($r->reorder_level)) {
            $product->inventory()->update(['reorder_level' => $r->reorder_level]);
        }

        return response()->json($product->load(['category', 'inventory']), $product->wasRecentlyCreated ? 201 : 200);
    }

    public function deleteProduct(Product $product)
    {
        $product->update(['active' => false]);

        return response()->json(['message' => 'Product archived.']);
    }

    public function stock(Request $r, Product $product)
    {
        $d = $r->validate(['type' => 'required|in:IN,OUT,ADJUST', 'quantity' => 'required|integer|min:0', 'notes' => 'nullable|string|max:1000']);

        return DB::transaction(function () use ($r, $product, $d) {
            $i = InventoryItem::where('product_id', $product->id)->lockForUpdate()->firstOrFail();
            $old = $i->stock_quantity;
            $qty = $d['quantity'];
            if ($d['type'] === 'IN') {
                $i->stock_quantity += $qty;
            } elseif ($d['type'] === 'OUT') {
                if ($qty > $old) {
                    return response()->json(['message' => 'Not enough stock.'], 422);
                }$i->stock_quantity -= $qty;
            } else {
                $i->stock_quantity = $qty;
                $qty = $i->stock_quantity - $old;
            }$i->save();
            InventoryTransaction::create(['product_id' => $product->id, 'transaction_type' => $d['type'], 'reference_type' => 'ADJUSTMENT', 'quantity' => $qty, 'notes' => $d['notes'] ?? null, 'user_id' => $r->user()->id]);

            return $product->load(['category', 'inventory']);
        });
    }

    public function sales(Request $r)
    {
        $q = Sale::with(['user:id,name', 'items.product:id,name,sku'])->latest();
        if ($r->user()->role !== 'admin') {
            $q->where('user_id', $r->user()->id);
        }

        return $q->paginate(min($r->integer('per_page', 15), 100));
    }

    public function updateSaleStatus(Request $r, Sale $sale)
    {
        $data = $r->validate(['status' => 'required|in:processing,ready,completed,cancelled']);

        return DB::transaction(function () use ($r, $sale, $data) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();
            $allowed = [
                'processing' => ['ready', 'completed', 'cancelled'],
                'ready' => ['completed', 'cancelled'],
                'completed' => [],
                'cancelled' => [],
            ];
            abort_unless(in_array($data['status'], $allowed[$sale->status] ?? [], true), 422, 'This order status change is not allowed.');

            if ($data['status'] === 'cancelled') {
                foreach ($sale->items as $line) {
                    $item = InventoryItem::where('product_id', $line->product_id)->lockForUpdate()->firstOrFail();
                    $item->increment('stock_quantity', $line->quantity);
                    InventoryTransaction::create([
                        'product_id' => $line->product_id,
                        'transaction_type' => 'IN',
                        'reference_type' => 'SALE_CANCELLATION',
                        'reference_id' => $sale->id,
                        'quantity' => $line->quantity,
                        'notes' => $sale->invoice_number,
                        'user_id' => $r->user()->id,
                    ]);
                }
            }

            $sale->update(['status' => $data['status']]);

            return $sale->fresh(['user:id,name', 'items.product:id,name,sku']);
        });
    }

    public function wishlist(Request $r)
    {
        return $r->user()->wishlists()
            ->whereHas('product', fn ($query) => $query->where('active', true))
            ->with('product.category', 'product.inventory')
            ->latest()
            ->get()
            ->pluck('product');
    }

    public function addToWishlist(Request $r)
    {
        $data = $r->validate(['product_id' => 'required|integer|exists:products,id']);
        $product = Product::whereKey($data['product_id'])->where('active', true)->firstOrFail();
        $r->user()->wishlists()->firstOrCreate(['product_id' => $product->id]);

        return response()->json($product->load(['category', 'inventory']), 201);
    }

    public function removeFromWishlist(Request $r, Product $product)
    {
        $r->user()->wishlists()->where('product_id', $product->id)->delete();

        return response()->json(['message' => 'Product removed from wishlist.']);
    }

    public function createSale(Request $r)
    {
        $d = $r->validate(['payment_method' => 'required|in:cash,card,transfer,other', 'items' => 'required|array|min:1', 'items.*.product_id' => 'required|integer|exists:products,id', 'items.*.quantity' => 'required|integer|min:1']);

        return DB::transaction(function () use ($r, $d) {
            $sale = Sale::create(['invoice_number' => 'INV-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)), 'user_id' => $r->user()->id, 'total_amount' => 0, 'payment_method' => $d['payment_method'], 'status' => 'processing']);
            $total = 0;
            foreach ($d['items'] as $line) {
                $p = Product::whereKey($line['product_id'])->where('active', true)->firstOrFail();
                $i = InventoryItem::where('product_id', $p->id)->lockForUpdate()->firstOrFail();
                if ($i->stock_quantity < $line['quantity']) {
                    abort(422, "Insufficient stock for {$p->name}.");
                }$sum = round((float) $p->price * $line['quantity'], 2);
                $sale->items()->create(['product_id' => $p->id, 'quantity' => $line['quantity'], 'unit_price' => $p->price, 'line_total' => $sum]);
                $i->decrement('stock_quantity', $line['quantity']);
                InventoryTransaction::create(['product_id' => $p->id, 'transaction_type' => 'OUT', 'reference_type' => 'SALE', 'reference_id' => $sale->id, 'quantity' => -$line['quantity'], 'notes' => $sale->invoice_number, 'user_id' => $r->user()->id]);
                $total += $sum;
            }$sale->update(['total_amount' => $total]);

            return response()->json($sale->load(['user:id,name', 'items.product:id,name,sku']), 201);
        });
    }

    public function transactions(Request $r)
    {
        $q = InventoryTransaction::with(['product:id,name,sku', 'user:id,name'])->latest();
        if ($r->filled('product_id')) {
            $q->where('product_id', $r->integer('product_id'));
        }

        return $q->paginate(min($r->integer('per_page', 20), 100));
    }

    public function restocks(Request $r)
    {
        $q = RestockRequest::with(['product:id,name,sku', 'product.inventory', 'requester:id,name', 'approver:id,name'])->latest();
        if ($r->user()->role !== 'admin') {
            $q->where('requested_by', $r->user()->id);
        }

        return $q->paginate(20);
    }

    public function createRestock(Request $r)
    {
        $d = $r->validate(['product_id' => 'required|exists:products,id', 'quantity' => 'required|integer|min:1', 'notes' => 'nullable|string']);

        return RestockRequest::create([...$d, 'requested_by' => $r->user()->id]);
    }

    public function updateRestock(Request $r, RestockRequest $restock)
    {
        $d = $r->validate(['status' => 'required|in:approved,received', 'notes' => 'nullable|string']);
        if ($restock->status === 'received') {
            abort(422, 'This restock is already received.');
        }if ($d['status'] === 'received' && $restock->status !== 'approved') {
            abort(422, 'Approve the request before receiving it.');
        }if ($d['status'] === 'approved') {
            $restock->update(['status' => 'approved', 'approved_by' => $r->user()->id, 'notes' => $d['notes'] ?? $restock->notes]);
        } else {
            DB::transaction(function () use ($r, $restock, $d) {
                $item = InventoryItem::where('product_id', $restock->product_id)->lockForUpdate()->firstOrFail();
                $item->increment('stock_quantity', $restock->quantity);
                $restock->update(['status' => 'received', 'received_at' => now(), 'notes' => $d['notes'] ?? $restock->notes]);
                InventoryTransaction::create(['product_id' => $restock->product_id, 'transaction_type' => 'IN', 'reference_type' => 'RESTOCK', 'reference_id' => $restock->id, 'quantity' => $restock->quantity, 'notes' => $restock->notes, 'user_id' => $r->user()->id]);
            });
        }

        return $restock->fresh(['product', 'requester', 'approver']);
    }

    public function dashboard()
    {
        $today = Sale::whereDate('created_at', today())->where('status', '!=', 'cancelled');
        $startDate = today()->subDays(6);
        $salesByDate = Sale::query()
            ->where('created_at', '>=', $startDate)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');
        $salesChart = collect(range(0, 6))->map(function ($offset) use ($startDate, $salesByDate) {
            $date = $startDate->copy()->addDays($offset);

            return ['date' => $date->toDateString(), 'total' => (float) ($salesByDate[$date->toDateString()] ?? 0)];
        });

        return ['total_products' => Product::where('active', true)->count(), 'low_stock_count' => InventoryItem::whereHas('product', fn ($query) => $query->where('active', true))->whereColumn('stock_quantity', '<=', 'reorder_level')->count(), 'out_of_stock_count' => InventoryItem::whereHas('product', fn ($query) => $query->where('active', true))->where('stock_quantity', 0)->count(), 'low_stock_items' => Product::with('inventory')->where('active', true)->whereHas('inventory', fn ($query) => $query->whereColumn('stock_quantity', '<=', 'reorder_level'))->limit(5)->get(), 'today_sales_total' => (float) (clone $today)->sum('total_amount'), 'today_sales_count' => (clone $today)->count(), 'sales_chart' => $salesChart, 'best_sellers' => SaleItem::whereHas('sale', fn ($query) => $query->where('status', '!=', 'cancelled'))->select('product_id', DB::raw('SUM(quantity) as quantity_sold'))->with('product:id,name,sku')->groupBy('product_id')->orderByDesc('quantity_sold')->limit(5)->get()];
    }
}
