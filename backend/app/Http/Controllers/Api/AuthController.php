<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $u = User::where('email', $data['email'])->first();
        if (! $u || ! Hash::check($data['password'], $u->password)) {
            throw ValidationException::withMessages(['email' => ['The credentials are incorrect.']]);
        }

return response()->json(['token' => $u->createToken('store-api')->plainTextToken, 'user' => $u], 200);
    }

    public function register(Request $r)
    {
        $d = $r->validate(['name' => 'required|string|max:120', 'email' => 'required|email|unique:users,email', 'password' => 'required|string|min:8']);
        $u = User::create([...$d, 'role' => 'staff']);

        return response()->json(['token' => $u->createToken('store-api')->plainTextToken, 'user' => $u], 201);
    }

    public function me(Request $r)
    {
        return $r->user();
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
