<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RoomController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('rooms', RoomController::class);
    Route::post('/rooms/{room}/canvas_state', [RoomController::class, 'saveCanvas']);
    Route::get('/rooms/{room}/video-token', [RoomController::class, 'generateVideoToken']);
});
