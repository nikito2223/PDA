package io.github.nikito2223.pdaweb.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import io.github.nikito2223.pdaweb.data.Group
import io.github.nikito2223.pdaweb.databinding.ItemGroupBinding

class GroupAdapter : RecyclerView.Adapter<GroupAdapter.GroupVH>() {

    private val items = mutableListOf<Group>()

    fun submitList(data: List<Group>) {
        items.clear()
        items.addAll(data)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GroupVH {
        val binding = ItemGroupBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return GroupVH(binding)
    }

    override fun onBindViewHolder(holder: GroupVH, position: Int) = holder.bind(items[position])

    override fun getItemCount(): Int = items.size

    class GroupVH(private val binding: ItemGroupBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Group) {
            binding.name.text = item.name
            binding.description.text = item.description
            binding.date.text = item.createdAt?.take(10) ?: ""
        }
    }
}
