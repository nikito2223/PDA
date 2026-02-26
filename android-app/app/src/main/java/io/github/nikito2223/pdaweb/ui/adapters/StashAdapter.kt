package io.github.nikito2223.pdaweb.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import io.github.nikito2223.pdaweb.data.Stash
import io.github.nikito2223.pdaweb.databinding.ItemStashBinding

class StashAdapter : RecyclerView.Adapter<StashAdapter.StashVH>() {

    private val items = mutableListOf<Stash>()

    fun submitList(data: List<Stash>) {
        items.clear()
        items.addAll(data)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StashVH {
        val binding = ItemStashBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return StashVH(binding)
    }

    override fun onBindViewHolder(holder: StashVH, position: Int) = holder.bind(items[position])

    override fun getItemCount(): Int = items.size

    class StashVH(private val binding: ItemStashBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Stash) {
            binding.name.text = item.name
            binding.type.text = item.type.uppercase()
            binding.description.text = item.description
            binding.coords.text = "${item.lat}, ${item.lng}"
        }
    }
}
