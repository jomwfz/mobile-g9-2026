import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { supabase } from "../../services/supabaseClient";
import {
  AvatarWithFrame,
  useUserAppTheme,
  getRankName,
} from "../../utils/gaymMarketConfig";

export default function ThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme } = useUserAppTheme();

  const [session, setSession] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [post, setPost] = useState(null);
  const [postAuthor, setPostAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      supabase.auth
        .getSession()
        .then(async ({ data: { session: currentSession } }) => {
          setSession(currentSession);
          if (currentSession) {
            const { data: p } = await supabase
              .from("profiles")
              .select("is_admin")
              .eq("id", currentSession.user.id)
              .maybeSingle();
            setMyProfile(p);
          }
        });
      if (id) {
        fetchThreadData();
      }
    }, [id]),
  );

  const fetchThreadData = async () => {
    try {
      setLoading(true);

      const { data: postData, error: postError } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (postError) throw postError;
      setPost(postData);

      if (postData?.user_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
          )
          .eq("id", postData.user_id)
          .single();
        setPostAuthor(authorData);
      }

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", id);
      setLikes(likesData || []);

      const { data: commentsData, error: commentsError } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map((c) => c.user_id))];
        const { data: commentProfiles } = await supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
          )
          .in("id", userIds);

        const enrichedComments = commentsData.map((c) => ({
          ...c,
          author: commentProfiles?.find((p) => p.id === c.user_id) || null,
        }));
        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching thread:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!session) return;
    const isLiked = likes.some((l) => l.user_id === session.user.id);
    try {
      if (isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .match({ post_id: id, user_id: session.user.id });
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: id, user_id: session.user.id });
      }
      fetchThreadData();
    } catch (error) {
      console.error("Like error:", error.message);
    }
  };

  // ลบโพสต์ของตัวเองจากในหน้า Thread
  const handleDeleteCurrentPost = () => {
    Alert.alert("ยืนยันการลบโพสต์", "ต้องการลบโพสต์นี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบโพสต์",
        style: "destructive",
        onPress: async () => {
          await supabase.from("community_posts").delete().eq("id", id);
          router.back();
        },
      },
    ]);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !session) return;
    try {
      const { error } = await supabase.from("community_comments").insert({
        post_id: id,
        user_id: session.user.id,
        content: newComment.trim(),
      });

      if (error) throw error;
      setNewComment("");
      fetchThreadData();
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from("community_comments").delete().eq("id", commentId);
    fetchThreadData();
  };

  const renderComment = ({ item }) => {
    const commentLevel = item.author?.level || 1;
    const commentRank = getRankName(commentLevel);
    const canDeleteComment =
      item.user_id === session?.user?.id || myProfile?.is_admin === true;

    return (
      <View
        style={[
          styles.commentCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={{ marginRight: 12 }}
          onPress={() => router.push(`/user/${item.user_id}`)}
        >
          <AvatarWithFrame
            avatarUrl={item.author?.avatar_url}
            username={item.author?.username}
            frameId={item.author?.equipped_frame || "none"}
            size={38}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={styles.commentHeader}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <Text style={[styles.commentUsername, { color: theme.text }]}>
                {item.author?.username || "Unknown"}
              </Text>
              {item.author?.is_dev && (
                <View style={styles.devBadgeSmall}>
                  <Text style={styles.devBadgeTextSmall}>DEV</Text>
                </View>
              )}
              <View style={styles.rankBadgeSmall}>
                <Text style={styles.rankTextSmall}>
                  LV.{commentLevel} {commentRank}
                </Text>
              </View>
            </View>
            {canDeleteComment && (
              <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.commentContent, { color: theme.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.center}>
          <Text style={{ color: theme.subText }}>ไม่พบกระทู้นี้</Text>
        </View>
      </SafeAreaView>
    );
  }

  const postLevel = postAuthor?.level || 1;
  const postRank = getRankName(postLevel);
  const isLiked = likes.some((l) => l.user_id === session?.user?.id);
  const canDeletePost =
    post.user_id === session?.user?.id || myProfile?.is_admin === true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Thread</Text>
        {canDeletePost ? (
          <TouchableOpacity
            onPress={handleDeleteCurrentPost}
            style={styles.backBtn}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComment}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.mainPostSection}>
              <TouchableOpacity
                style={styles.postUserInfo}
                onPress={() => router.push(`/user/${post.user_id}`)}
              >
                <View style={{ marginRight: 12 }}>
                  <AvatarWithFrame
                    avatarUrl={postAuthor?.avatar_url}
                    username={postAuthor?.username}
                    frameId={postAuthor?.equipped_frame || "none"}
                    size={48}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <Text style={[styles.postUsername, { color: theme.text }]}>
                      {postAuthor?.username || "Unknown"}
                    </Text>
                    {postAuthor?.is_dev && (
                      <View style={styles.devBadge}>
                        <Text style={styles.devBadgeText}>DEV</Text>
                      </View>
                    )}
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>
                        LV.{postLevel} {postRank}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.postTime, { color: theme.subText }]}>
                    {new Date(post.created_at).toLocaleString("th-TH")}
                  </Text>
                </View>
              </TouchableOpacity>

              {post.content ? (
                <Text style={[styles.postContent, { color: theme.text }]}>
                  {post.content}
                </Text>
              ) : null}

              {post.image_url ? (
                <Image
                  source={{ uri: post.image_url }}
                  style={styles.postAttachedImage}
                />
              ) : null}

              <View style={[styles.likeRow, { borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.likeBtn}
                  onPress={handleToggleLike}
                >
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={isLiked ? "#ef4444" : theme.subText}
                  />
                  <Text
                    style={[
                      styles.likeCountText,
                      { color: isLiked ? "#ef4444" : theme.subText },
                    ]}
                  >
                    {likes.length} ถูกใจ
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.commentSectionTitle, { color: theme.subText }]}
              >
                คอมเมนต์ตอบกลับ ({comments.length})
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputBar,
            { backgroundColor: theme.bg, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card, color: theme.text },
            ]}
            placeholder="เพิ่มคอมเมนต์ตอบกลับของคุณ..."
            placeholderTextColor={theme.subText}
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: theme.accent },
              !newComment.trim() && { opacity: 0.5 },
            ]}
            onPress={handleSendComment}
            disabled={!newComment.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  mainPostSection: { marginBottom: 15 },
  postUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  postUsername: { fontSize: 18, fontWeight: "bold" },
  postTime: { fontSize: 12, marginTop: 3 },
  postContent: { fontSize: 16, lineHeight: 24, marginBottom: 15 },
  postAttachedImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 15,
    resizeMode: "cover",
  },
  likeRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  likeCountText: { fontSize: 15, fontWeight: "bold" },
  commentSectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  commentCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentUsername: { fontSize: 15, fontWeight: "bold" },
  commentContent: { fontSize: 14, lineHeight: 20 },
  devBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  rankBadge: {
    backgroundColor: "rgba(255, 170, 0, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankText: { color: "#ffaa00", fontSize: 11, fontWeight: "bold" },
  devBadgeSmall: {
    backgroundColor: "#10b981",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  devBadgeTextSmall: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  rankBadgeSmall: {
    backgroundColor: "rgba(255, 170, 0, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rankTextSmall: { color: "#ffaa00", fontSize: 10, fontWeight: "bold" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 15,
    marginRight: 10,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
});
