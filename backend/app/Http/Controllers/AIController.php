<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIController extends Controller
{
    public function chat(Request $request, Room $room)
    {
        $request->validate([
            'prompt' => 'required|string',
        ]);

        $textPrompt = "Ты — ИИ-ассистент интерактивной доске. Твой контекст объектов (JSON): " . json_encode($room->canvas_state) . ". Вопрос пользователя: " . $request->prompt;

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'x-goog-api-key' => env('GEMINI_API_KEY'),
            ])->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $textPrompt]
                        ]
                    ]
                ]
            ]);

            if ($response->failed()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gemini API Error',
                    'details' => $response->body()
                ], $response->status() >= 400 ? $response->status() : 500);
            }

            $text = $response->json('candidates.0.content.parts.0.text');

            return response()->json(['reply' => $text]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function generateMedia(Request $request, Room $room)
    {
        $request->validate([
            'prompt' => 'required|string',
            'type' => 'required|string|in:image,video',
            'image_url' => 'required_if:type,video|string',
        ]);

        $id = env('HIGGSFIELD_API_KEY_ID');
        $secret = env('HIGGSFIELD_API_KEY_SECRET');

        $url = $request->type === 'video'
            ? 'https://platform.higgsfield.ai/higgsfield-ai/dop/standard'
            : 'https://platform.higgsfield.ai/higgsfield-ai/soul/standard';

        $payload = $request->type === 'video'
            ? [
                'prompt' => $request->prompt,
                'image_url' => $request->image_url,
                'duration' => 5,
            ]
            : [
                'prompt' => $request->prompt,
                'aspect_ratio' => '16:9',
                'resolution' => '720p',
            ];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Key {$id}:{$secret}",
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post($url, $payload);

            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function checkMediaStatus(Request $request, Room $room, $requestId)
    {
        $id = env('HIGGSFIELD_API_KEY_ID');
        $secret = env('HIGGSFIELD_API_KEY_SECRET');

        try {
            $response = Http::withHeaders([
                'Authorization' => "Key {$id}:{$secret}"
            ])->get("https://platform.higgsfield.ai/requests/{$requestId}/status");

            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
