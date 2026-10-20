<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Middleware\AdminOnly;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});
Route::middleware('auth:sanctum')->group(function () {
    Route::get('categories', [StoreController::class, 'categories']);
    Route::get('products', [StoreController::class, 'products']);
    Route::get('sales', [StoreController::class, 'sales']);
    Route::post('sales', [StoreController::class, 'createSale']);
    Route::get('wishlist', [StoreController::class, 'wishlist']);
    Route::post('wishlist', [StoreController::class, 'addToWishlist']);
    Route::delete('wishlist/{product}', [StoreController::class, 'removeFromWishlist']);
    Route::get('restocks', [StoreController::class, 'restocks']);
    Route::post('restocks', [StoreController::class, 'createRestock']);
    Route::middleware(AdminOnly::class)->group(function () {
        Route::get('dashboard', [StoreController::class, 'dashboard']);
        Route::patch('sales/{sale}/status', [StoreController::class, 'updateSaleStatus']);
        Route::post('categories', [StoreController::class, 'saveCategory']);
        Route::put('categories/{category}', [StoreController::class, 'saveCategory']);
        Route::delete('categories/{category}', [StoreController::class, 'deleteCategory']);
        Route::post('products', [StoreController::class, 'saveProduct']);
        Route::put('products/{product}', [StoreController::class, 'saveProduct']);
        Route::delete('products/{product}', [StoreController::class, 'deleteProduct']);
        Route::post('products/{product}/stock', [StoreController::class, 'stock']);
        Route::get('inventory/transactions', [StoreController::class, 'transactions']);
        Route::patch('restocks/{restock}', [StoreController::class, 'updateRestock']);
    });
});
