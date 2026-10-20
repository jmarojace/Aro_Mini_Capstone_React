<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\InventoryItem;
use App\Models\Product;
use Illuminate\Database\Seeder;

class FilipinoProductsSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Filipino Snacks' => 'Popular snacks and treats from the Philippines.',
            'Filipino Pantry' => 'Everyday Filipino sauces, noodles, and canned goods.',
            'Filipino Staples' => 'Common rice and pantry staples in Filipino homes.',
        ];

        foreach ($categories as $name => $description) {
            Category::firstOrCreate(['name' => $name], ['description' => $description]);
        }

        $products = [
            ['Filipino Snacks', 'Oishi Prawn Crackers 60g', 'PH-SNK-0001', '25.00', 30, 8],
            ['Filipino Snacks', 'Chippy BBQ Corn Chips 108g', 'PH-SNK-0002', '30.00', 24, 8],
            ['Filipino Snacks', 'Piattos Cheese 85g', 'PH-SNK-0003', '32.00', 24, 8],
            ['Filipino Snacks', 'SkyFlakes Crackers 250g', 'PH-SNK-0004', '48.00', 20, 6],
            ['Filipino Snacks', 'Boy Bawang Garlic Cornick 100g', 'PH-SNK-0005', '28.00', 24, 8],
            ['Filipino Snacks', 'Polvoron Assorted 12-pack', 'PH-SNK-0006', '95.00', 12, 4],
            ['Filipino Pantry', 'Lucky Me Pancit Canton Original 80g', 'PH-PAN-0001', '18.00', 48, 12],
            ['Filipino Pantry', 'Lucky Me Instant Bulalo Noodles 55g', 'PH-PAN-0002', '16.00', 36, 10],
            ['Filipino Pantry', 'Argentina Corned Beef 150g', 'PH-PAN-0003', '42.00', 20, 6],
            ['Filipino Pantry', '555 Sardines in Tomato Sauce 155g', 'PH-PAN-0004', '27.00', 24, 8],
            ['Filipino Pantry', 'Century Tuna Flakes in Oil 180g', 'PH-PAN-0005', '52.00', 18, 6],
            ['Filipino Pantry', 'UFC Banana Catsup 320g', 'PH-PAN-0006', '49.00', 15, 5],
            ['Filipino Pantry', 'Datu Puti Sukang Paombong 750ml', 'PH-PAN-0007', '45.00', 15, 5],
            ['Filipino Pantry', 'Silver Swan Soy Sauce 1L', 'PH-PAN-0008', '58.00', 15, 5],
            ['Filipino Pantry', 'Mama Sita Kare-Kare Mix 50g', 'PH-PAN-0009', '32.00', 18, 6],
            ['Filipino Staples', 'Sinandomeng Rice 1kg', 'PH-STP-0001', '62.00', 30, 10],
            ['Filipino Staples', 'Dinorado Rice 1kg', 'PH-STP-0002', '68.00', 24, 8],
            ['Filipino Staples', 'Brown Sugar 1kg', 'PH-STP-0003', '82.00', 16, 5],
        ];

        foreach ($products as [$categoryName, $name, $sku, $price, $stock, $reorderLevel]) {
            $product = Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'category_id' => Category::where('name', $categoryName)->value('id'),
                    'name' => $name,
                    'description' => 'Popular Filipino grocery product.',
                    'price' => $price,
                    'active' => true,
                ],
            );

            InventoryItem::firstOrCreate(
                ['product_id' => $product->id],
                ['stock_quantity' => $stock, 'reorder_level' => $reorderLevel],
            );
        }
    }
}
