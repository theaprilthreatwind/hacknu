<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIController extends Controller
{
    public function chat(Request $request, $uuidOrId)
    {
        set_time_limit(120);

        $request->validate([
            'prompt' => 'required|string',
            'canvas_state' => 'nullable|array',
        ]);

        $query = Room::query();
        if (is_numeric($uuidOrId)) {
            $query->where('id', $uuidOrId);
        } else {
            $query->where('share_uuid', $uuidOrId);
        }
        $room = $query->firstOrFail();

        $canvasState = json_encode($request->input('canvas_state', $room->canvas_state ?? []));

        $systemPrompt = "Ты — ИИ-ассистент, являющийся 'пространственным участником' (spatial participant) на бесконечной визуальной доске.
Твоя задача — анализировать текущее состояние холста (canvas_state) и промпт пользователя, чтобы генерировать новые идеи или ответы в виде карточек.
СТРОГИЕ ПРАВИЛА:
1. Выбери для новых карточек свободные координаты (x, y) рядом с существующими узлами, чтобы они логично дополняли доску (не накладывались друг на друга). Расстояние между карточками должно быть около 250-300 пикселей.
2. Сгенерируй новые узлы, тип которых строго 'higgsfield'.
3. ОТВЕТ ДОЛЖЕН БЫТЬ СТРОГО В ПРАВИЛЬНОМ JSON ФОРМАТЕ БЕЗ MARKDOWN ОБЕРТОК (БЕЗ ```json и БЕЗ ```).
4. Структура JSON:
{
  \"reply\": \"Текст-ответ для пользователя\",
  \"new_nodes\": [
    {
      \"id\": \"unique-ai-node-1\",
      \"position\": { \"x\": 500, \"y\": 200 },
      \"type\": \"higgsfield\",
      \"data\": { \"label\": \"AI IDEA\", \"content\": \"Описание идеи или промпт...\", \"active\": false }
    }
  ],
  \"new_edges\": []
}

Текущее состояние доски: {$canvasState}
Вопрос пользователя: {$request->prompt}";

        try {
            $response = Http::timeout(120)->withHeaders([
                'Content-Type' => 'application/json',
                'x-goog-api-key' => env('GEMINI_API_KEY'),
            ])->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $systemPrompt]
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

            // Очистка от возможных markdown артефактов
            $text = preg_replace('/```json\s*/', '', $text);
            $text = preg_replace('/```\s*/', '', $text);
            $text = trim($text);

            $parsedData = json_decode($text, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'reply' => "Ошибка парсинга ответа ИИ: " . json_last_error_msg(),
                    'raw_response' => $text,
                    'new_nodes' => [],
                    'new_edges' => []
                ]);
            }

            return response()->json([
                'reply' => $parsedData['reply'] ?? '',
                'new_nodes' => $parsedData['new_nodes'] ?? [],
                'new_edges' => $parsedData['new_edges'] ?? [],
            ]);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function generateMedia(Request $request, $uuidOrId)
    {
        $request->validate([
            'prompt' => 'required|string',
            'type' => 'required|string|in:image,video',
            'image_url' => 'required_if:type,video|string',
        ]);

        $query = Room::query();
        if (is_numeric($uuidOrId)) {
            $query->where('id', $uuidOrId);
        } else {
            $query->where('share_uuid', $uuidOrId);
        }
        $room = $query->firstOrFail();


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

    public function checkMediaStatus(Request $request, $uuidOrId, $requestId)
    {
        $id = env('HIGGSFIELD_API_KEY_ID');
        $secret = env('HIGGSFIELD_API_KEY_SECRET');

        $query = Room::query();
        if (is_numeric($uuidOrId)) {
            $query->where('id', $uuidOrId);
        } else {
            $query->where('share_uuid', $uuidOrId);
        }
        $room = $query->firstOrFail();


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
