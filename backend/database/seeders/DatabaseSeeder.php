<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $oldAdmin = User::where('email', 'admin@ministore.test')->first();
        if ($oldAdmin) {
            $oldAdmin->email = 'admin@gmail.com';
            $oldAdmin->password = 'admin123';
            $oldAdmin->save();
        }
        $oldStaff = User::where('email', 'staff@ministore.test')->first();
        if ($oldStaff) {
            $oldStaff->email = 'staff@gmail.com';
            $oldStaff->password = 'staff123';
            $oldStaff->save();
        }
        User::updateOrCreate(['email' => 'admin@gmail.com'], ['name' => 'Store Admin', 'role' => 'admin', 'password' => 'admin123']);
        User::updateOrCreate(['email' => 'staff@gmail.com'], ['name' => 'Store Staff', 'role' => 'staff', 'password' => 'staff123']);
        $category = Category::firstOrCreate(['name' => 'General'], ['description' => 'Sample store category']);
        foreach ([['Rice 5kg', 'SKU-0001', 12.50, 18, 5], ['Cooking Oil 1L', 'SKU-0002', 8.75, 4, 5], ['Canned Sardines', 'SKU-0003', 3.25, 0, 8]] as [$name,$sku,$price,$stock,$reorder]) {
            $product = Product::firstOrCreate(['sku' => $sku], ['category_id' => $category->id, 'name' => $name, 'price' => $price]);
            InventoryItem::updateOrCreate(['product_id' => $product->id], ['stock_quantity' => $stock, 'reorder_level' => $reorder]);
        }

        $this->call(FilipinoProductsSeeder::class);
    }
}
