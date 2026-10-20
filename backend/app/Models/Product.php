<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['category_id', 'name', 'sku', 'description', 'image_url', 'price', 'active'];

    protected $casts = ['price' => 'decimal:2', 'active' => 'boolean'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function inventory()
    {
        return $this->hasOne(InventoryItem::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }
}
