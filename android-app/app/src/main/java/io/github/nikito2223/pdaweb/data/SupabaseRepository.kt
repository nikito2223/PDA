package io.github.nikito2223.pdaweb.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray

class SupabaseRepository {

    private val client = OkHttpClient()

    suspend fun loadStashes(): List<Stash> = withContext(Dispatchers.IO) {
        val req = Request.Builder()
            .url("$baseUrl/rest/v1/stashes?select=id,name,description,lat,lng,type,created_at&order=created_at.desc")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .build()

        client.newCall(req).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string().orEmpty()
            parseStashes(JSONArray(body))
        }
    }

    suspend fun loadGroups(): List<Group> = withContext(Dispatchers.IO) {
        val req = Request.Builder()
            .url("$baseUrl/rest/v1/factions?select=id,name,description,created_at&order=created_at.desc")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .build()

        client.newCall(req).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string().orEmpty()
            parseGroups(JSONArray(body))
        }
    }

    private fun parseStashes(json: JSONArray): List<Stash> {
        val result = mutableListOf<Stash>()
        for (i in 0 until json.length()) {
            val item = json.getJSONObject(i)
            result += Stash(
                id = item.optString("id"),
                name = item.optString("name", "Без названия"),
                description = item.optString("description", "Нет описания"),
                lat = item.optDouble("lat", 0.0),
                lng = item.optDouble("lng", 0.0),
                type = item.optString("type", "stash"),
                createdAt = item.takeIf { it.has("created_at") && !it.isNull("created_at") }?.optString("created_at")
            )
        }
        return result
    }

    private fun parseGroups(json: JSONArray): List<Group> {
        val result = mutableListOf<Group>()
        for (i in 0 until json.length()) {
            val item = json.getJSONObject(i)
            result += Group(
                id = item.optString("id"),
                name = item.optString("name", "Без названия"),
                description = item.optString("description", "Нет описания"),
                createdAt = item.takeIf { it.has("created_at") && !it.isNull("created_at") }?.optString("created_at")
            )
        }
        return result
    }

    companion object {
        private const val baseUrl = "https://jezvycdhlfrjitqydhur.supabase.co"
        private const val anonKey = "sb_publishable_DL_SkwBCIrHB0f7oIhwWAA_r7B2VMut"
    }
}
