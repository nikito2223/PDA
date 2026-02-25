package io.github.nikito2223.pdaweb.data

data class Stash(
    val id: String,
    val name: String,
    val description: String,
    val lat: Double,
    val lng: Double,
    val type: String,
    val createdAt: String?
)

data class Group(
    val id: String,
    val name: String,
    val description: String,
    val createdAt: String?
)

data class JournalEntry(
    val date: String,
    val text: String
)
