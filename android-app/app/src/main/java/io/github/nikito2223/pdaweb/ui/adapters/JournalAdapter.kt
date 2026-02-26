package io.github.nikito2223.pdaweb.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import io.github.nikito2223.pdaweb.data.JournalEntry
import io.github.nikito2223.pdaweb.databinding.ItemJournalBinding

class JournalAdapter : RecyclerView.Adapter<JournalAdapter.JournalVH>() {

    private val items = mutableListOf<JournalEntry>()

    fun submitList(data: List<JournalEntry>) {
        items.clear()
        items.addAll(data)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): JournalVH {
        val binding = ItemJournalBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return JournalVH(binding)
    }

    override fun onBindViewHolder(holder: JournalVH, position: Int) = holder.bind(items[position])

    override fun getItemCount(): Int = items.size

    class JournalVH(private val binding: ItemJournalBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: JournalEntry) {
            binding.date.text = item.date
            binding.text.text = item.text
        }
    }
}
