<?php

use App\Http\Controllers\AIController;
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
    Route::get('/rooms/join/{uuid}', [RoomController::class, 'joinByUuid']);
    Route::post('/rooms/{room}/canvas_state', [RoomController::class, 'saveCanvas']);
    Route::get('/rooms/{room}/video-token', [RoomController::class, 'generateVideoToken']);
    Route::post('/rooms/{room}/ai/chat', [AIController::class, 'chat']);
    Route::post('/rooms/{room}/ai/generate', [AIController::class, 'generateMedia']);
    Route::get('/rooms/{room}/ai/status/{requestId}', [AIController::class, 'checkMediaStatus']);
});
