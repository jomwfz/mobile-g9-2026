import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../services/supabaseClient";
import {
  AvatarWithFrame,
  useUserAppTheme,
  addPlayerLevel,
  getRankName,
} from "../../utils/gaymMarketConfig";

export default function CommunityScreen() {
  const router = useRouter();
  const { theme, isRgbTheme, animatedRgbColor } = useUserAppTheme();

  const [session, setSession] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  // แท็บหลักแบบเดิม: 'world' (แชทโลก) | 'private' (แชทส่วนตัว & เพื่อน)
  const [activeTab, setActiveTab] = useState("world");

  // ---------------- 1. State แชทโลก (community_posts) ----------------
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // Modal สำหรับกด Comment Reply โพสต์
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // ---------------- 2. State แชทส่วนตัว & เพื่อน (friends / private_messages) ----------------
  const [friendsList, setFriendsList] = useState([]);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  const [activeChatPartner, setActiveChatPartner] = useState(null); // ถ้าเลือกเพื่อน = เปิดห้องแชทคุยกัน
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateText, setPrivateText] = useState("");
  const [privateImage, setPrivateImage] = useState(null);
  const [sendingPrivate, setSendingPrivate] = useState(false);

  // ค้นหาผู้เล่นในแท็บแชทส่วนตัว
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ---------------- 3. State กล่องข้อความมุมขวาบน (แยกจากแชทส่วนตัว) ----------------
  const [inboxModalVisible, setInboxModalVisible] = useState(false);
  const [inboxSubTab, setInboxSubTab] = useState("alerts"); // 'alerts' | 'requests'
  const [incomingFriendReqs, setIncomingFriendReqs] = useState([]);
  const [incomingMsgAlerts, setIncomingMsgAlerts] = useState([]);
  const [postActivityAlerts, setPostActivityAlerts] = useState([]);

  const privateListRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadAllCommunityData();
    }, []),
  );

  const loadAllCommunityData = async () => {
    setLoading(true);
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    setSession(currentSession);

    if (currentSession) {
      const { data: pData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .maybeSingle();
      setMyProfile(pData);

      await Promise.all([
        fetchWorldPosts(currentSession.user.id),
        fetchFriendsAndPrivateChats(currentSession.user.id),
        fetchInboxNotifications(currentSession.user.id),
      ]);
    } else {
      await fetchWorldPosts(null);
    }
    setLoading(false);
  };

  // =========================================================================
  // ส่วนที่ 1: ดึงข้อมูลโพสต์แชทโลก (community_posts + post_likes + community_comments)
  // =========================================================================
  const fetchWorldPosts = async (myId) => {
    try {
      const { data: postsData, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const postList = postsData || [];
      if (postList.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = postList.map((p) => p.id);
      const authorIds = [...new Set(postList.map((p) => p.user_id))];

      const [profilesRes, likesRes, commentsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
          )
          .in("id", authorIds),
        supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds),
        supabase
          .from("community_comments")
          .select("id, post_id")
          .in("post_id", postIds),
      ]);

      const profilesMap = profilesRes.data || [];
      const likesList = likesRes.data || [];
      const commentsList = commentsRes.data || [];

      const enriched = postList.map((p) => {
        const pLikes = likesList.filter((l) => l.post_id === p.id);
        const pComments = commentsList.filter((c) => c.post_id === p.id);
        return {
          ...p,
          author: profilesMap.find((u) => u.id === p.user_id) || null,
          likeCount: pLikes.length,
          isLiked: myId ? pLikes.some((l) => l.user_id === myId) : false,
          commentCount: pComments.length,
        };
      });

      setPosts(enriched);
    } catch (error) {
      console.error("Error fetching world posts:", error.message);
    }
  };

  // โพสต์ลงแชทโลก (+1 LV.)
  const pickImageForPost = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPostImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !postImage) || !session) return;
    setPosting(true);
    try {
      let finalImageUrl = null;
      if (postImage) {
        const ext =
          postImage.substring(postImage.lastIndexOf(".") + 1) || "jpeg";
        const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(postImage, {
          encoding: "base64",
        });

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, decode(base64), { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("community_posts").insert({
        user_id: session.user.id,
        content: newPost.trim(),
        image_url: finalImageUrl,
      });

      if (error) throw error;

      // ได้รับ +1 LV. เมื่อโพสต์ในแชทโลกสำเร็จ
      await addPlayerLevel(session.user.id, 1);

      setNewPost("");
      setPostImage(null);
      fetchWorldPosts(session.user.id);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setPosting(false);
    }
  };

  // ลบโพสต์ของตัวเอง (หรือ Admin ลบ)
  const handleDeletePost = (postItem) => {
    const canDelete =
      postItem.user_id === session?.user?.id || myProfile?.is_admin === true;
    if (!canDelete) return;

    Alert.alert("ลบโพสต์", "คุณต้องการลบโพสต์นี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบโพสต์",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("community_posts")
              .delete()
              .eq("id", postItem.id);
            if (error) throw error;
            fetchWorldPosts(session?.user?.id);
          } catch (error) {
            Alert.alert("เกิดข้อผิดพลาด", error.message);
          }
        },
      },
    ]);
  };

  // กดหัวใจ (Like)
  const handleToggleLike = async (postItem) => {
    if (!session) return;
    try {
      if (postItem.isLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .match({ post_id: postItem.id, user_id: session.user.id });
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postItem.id, user_id: session.user.id });
      }
      fetchWorldPosts(session.user.id);
    } catch (error) {
      console.error("Like error:", error.message);
    }
  };

  // เปิดดูและตอบกลับ Comment Reply
  const openCommentModal = async (postItem) => {
    setSelectedPost(postItem);
    setReplyModalVisible(true);
    await loadComments(postItem.id);
  };

  const loadComments = async (postId) => {
    try {
      setLoadingComments(true);
      const { data: cData, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const list = cData || [];

      if (list.length > 0) {
        const uIds = [...new Set(list.map((c) => c.user_id))];
        const { data: pData } = await supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
          )
          .in("id", uIds);

        setPostComments(
          list.map((c) => ({
            ...c,
            author: (pData || []).find((u) => u.id === c.user_id) || null,
          })),
        );
      } else {
        setPostComments([]);
      }
    } catch (error) {
      console.error("Load comments error:", error.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!replyText.trim() || !session || !selectedPost) return;
    try {
      const { error } = await supabase.from("community_comments").insert({
        post_id: selectedPost.id,
        user_id: session.user.id,
        content: replyText.trim(),
      });
      if (error) throw error;
      setReplyText("");
      await loadComments(selectedPost.id);
      fetchWorldPosts(session.user.id);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from("community_comments").delete().eq("id", commentId);
    if (selectedPost) await loadComments(selectedPost.id);
    fetchWorldPosts(session?.user?.id);
  };

  // =========================================================================
  // ส่วนที่ 2: ดึงข้อมูลเพื่อน (friends) และ แชทส่วนตัว (private_messages)
  // =========================================================================
  const fetchFriendsAndPrivateChats = async (myId) => {
    try {
      // 1. ดึงรายชื่อเพื่อนจากตาราง friends เดิมของคุณ
      const { data: myFriendsRows } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", myId);

      const myFriendIds = (myFriendsRows || []).map((f) => f.friend_id);

      // 2. ดึงประวัติข้อความส่วนตัวทั้งหมดจาก private_messages
      const { data: msgsData } = await supabase
        .from("private_messages")
        .select("*")
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order("created_at", { ascending: false });

      const latestMsgByPartner = new Map();
      (msgsData || []).forEach((m) => {
        const partnerId = m.sender_id === myId ? m.receiver_id : m.sender_id;
        if (!latestMsgByPartner.has(partnerId)) {
          latestMsgByPartner.set(partnerId, m);
        }
      });

      const allPartnerIds = [
        ...new Set([...myFriendIds, ...Array.from(latestMsgByPartner.keys())]),
      ];

      if (allPartnerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
          )
          .in("id", allPartnerIds);

        const pList = profilesData || [];

        // เซ็ตรายชื่อเพื่อนทั้งหมด
        setFriendsList(pList.filter((u) => myFriendIds.includes(u.id)));

        // เซ็ตรายการห้องแชทส่วนตัวทั้งหมด (รวมเพื่อนและคนที่เคยคุย)
        const chatList = allPartnerIds.map((pid) => {
          const profileObj = pList.find((u) => u.id === pid) || {
            id: pid,
            username: "Gamer",
            level: 1,
          };
          const lastMsg = latestMsgByPartner.get(pid);
          return {
            partner: profileObj,
            isFriend: myFriendIds.includes(pid),
            lastMessage: lastMsg
              ? lastMsg.message || "[ส่งรูปภาพ]"
              : "แตะเพื่อเริ่มแชทกับเพื่อน",
            lastTime: lastMsg?.created_at || null,
          };
        });

        setChatHistoryList(chatList);
      } else {
        setFriendsList([]);
        setChatHistoryList([]);
      }
    } catch (error) {
      console.error("Error fetching friends & chats:", error.message);
    }
  };

  // เปิดห้องแชท 1-1 กับเพื่อนในแท็บแชทส่วนตัว
  const openPrivateChatRoom = async (partnerProfile) => {
    setActiveChatPartner(partnerProfile);
    if (!session) return;
    const myId = session.user.id;
    const targetId = partnerProfile.id;

    const { data: msgs } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${myId})`,
      )
      .order("created_at", { ascending: true });

    setPrivateMessages(msgs || []);
  };

  const pickImageForPrivateChat = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPrivateImage(result.assets[0].uri);
    }
  };

  const handleSendPrivateMessage = async () => {
    if (
      (!privateText.trim() && !privateImage) ||
      !session ||
      !activeChatPartner
    )
      return;
    setSendingPrivate(true);
    try {
      let finalImageUrl = null;
      if (privateImage) {
        const ext =
          privateImage.substring(privateImage.lastIndexOf(".") + 1) || "jpeg";
        const fileName = `chats/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(privateImage, {
          encoding: "base64",
        });

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, decode(base64), { contentType: `image/${ext}` });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("private_messages").insert({
        sender_id: session.user.id,
        receiver_id: activeChatPartner.id,
        message: privateText.trim(),
        image_url: finalImageUrl,
      });

      if (error) throw error;
      setPrivateText("");
      setPrivateImage(null);
      await openPrivateChatRoom(activeChatPartner);
      fetchFriendsAndPrivateChats(session.user.id);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setSendingPrivate(false);
    }
  };

  // ค้นหาผู้เล่นเพื่อเพิ่มเพื่อนหรือทักแชท
  const handleSearchPlayers = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, username, avatar_url, level, is_dev, is_admin, equipped_frame",
      )
      .ilike("username", `%${text.trim()}%`)
      .limit(10);

    setSearchResults((data || []).filter((u) => u.id !== session?.user?.id));
  };

  const handleAddFriend = async (targetUserId) => {
    if (!session) return;
    try {
      const exists = friendsList.some((f) => f.id === targetUserId);
      if (exists) {
        Alert.alert(
          "เป็นเพื่อนกันอยู่แล้ว",
          "ผู้เล่นคนนี้อยู่ในรายชื่อเพื่อนของคุณแล้ว",
        );
        return;
      }
      const { error } = await supabase.from("friends").insert({
        user_id: session.user.id,
        friend_id: targetUserId,
      });
      if (error) throw error;
      Alert.alert("สำเร็จ", "เพิ่มเป็นเพื่อนเรียบร้อยแล้ว!");
      fetchFriendsAndPrivateChats(session.user.id);
      fetchInboxNotifications(session.user.id);
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    }
  };

  // =========================================================================
  // ส่วนที่ 3: กล่องข้อความ (Inbox - แยกจากแชทส่วนตัว อยู่ที่ปุ่มมุมขวาบน)
  // =========================================================================
  const fetchInboxNotifications = async (myId) => {
    try {
      // 1. เช็คคนที่แอดเรามาเป็นเพื่อน (friend_id === myId) แต่เรายังไม่ได้แอดกลับ
      const [whoAddedMeRes, myFriendsRes] = await Promise.all([
        supabase.from("friends").select("id, user_id").eq("friend_id", myId),
        supabase.from("friends").select("friend_id").eq("user_id", myId),
      ]);

      const myFriendSet = new Set(
        (myFriendsRes.data || []).map((f) => f.friend_id),
      );
      const pendingRows = (whoAddedMeRes.data || []).filter(
        (row) => !myFriendSet.has(row.user_id),
      );

      if (pendingRows.length > 0) {
        const reqUserIds = pendingRows.map((r) => r.user_id);
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, level, is_dev, equipped_frame")
          .in("id", reqUserIds);

        setIncomingFriendReqs(
          pendingRows.map((r) => ({
            rowId: r.id,
            user: (reqProfiles || []).find((p) => p.id === r.user_id) || {
              id: r.user_id,
              username: "Gamer",
            },
          })),
        );
      } else {
        setIncomingFriendReqs([]);
      }

      // 2. แจ้งเตือนข้อความส่วนตัวที่มีคนทักเข้ามาหาเรา (receiver_id === myId)
      const { data: incomingMsgs } = await supabase
        .from("private_messages")
        .select("*")
        .eq("receiver_id", myId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (incomingMsgs && incomingMsgs.length > 0) {
        const senderIds = [...new Set(incomingMsgs.map((m) => m.sender_id))];
        const { data: sProfiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, level, is_dev, equipped_frame")
          .in("id", senderIds);

        const uniqueSenderAlerts = [];
        const seen = new Set();
        incomingMsgs.forEach((m) => {
          if (!seen.has(m.sender_id)) {
            seen.add(m.sender_id);
            uniqueSenderAlerts.push({
              id: m.id,
              message: m.message || "[ส่งรูปภาพ]",
              created_at: m.created_at,
              sender: (sProfiles || []).find((p) => p.id === m.sender_id) || {
                id: m.sender_id,
                username: "Gamer",
              },
            });
          }
        });
        setIncomingMsgAlerts(uniqueSenderAlerts);
      } else {
        setIncomingMsgAlerts([]);
      }

      // 3. แจ้งเตือนคนมาคอมเมนต์โพสต์แชทโลกของเรา
      const { data: myPosts } = await supabase
        .from("community_posts")
        .select("id, content")
        .eq("user_id", myId);

      if (myPosts && myPosts.length > 0) {
        const myPostIds = myPosts.map((p) => p.id);
        const { data: cmtList } = await supabase
          .from("community_comments")
          .select("*")
          .in("post_id", myPostIds)
          .neq("user_id", myId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (cmtList && cmtList.length > 0) {
          const cUserIds = [...new Set(cmtList.map((c) => c.user_id))];
          const { data: cProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, level, is_dev, equipped_frame")
            .in("id", cUserIds);

          setPostActivityAlerts(
            cmtList.map((c) => ({
              id: c.id,
              postId: c.post_id,
              content: c.content,
              created_at: c.created_at,
              user: (cProfiles || []).find((p) => p.id === c.user_id) || {
                id: c.user_id,
                username: "Gamer",
              },
            })),
          );
        } else {
          setPostActivityAlerts([]);
        }
      } else {
        setPostActivityAlerts([]);
      }
    } catch (error) {
      console.error("Error fetching inbox notifications:", error.message);
    }
  };

  // กดยอมรับเพื่อนในกล่องข้อความ
  const handleAcceptFriendInInbox = async (targetUserId) => {
    await handleAddFriend(targetUserId);
  };

  // กดปฏิเสธคำขอเป็นเพื่อนในกล่องข้อความ
  const handleDeclineFriendInInbox = async (rowId) => {
    await supabase.from("friends").delete().eq("id", rowId);
    if (session) fetchInboxNotifications(session.user.id);
  };

  const totalInboxCount =
    incomingFriendReqs.length +
    incomingMsgAlerts.length +
    postActivityAlerts.length;

  // เรนเดอร์โพสต์ในแชทโลก
  const renderWorldPost = ({ item }) => {
    const author = item.author;
    const lv = author?.level || 1;
    const rank = getRankName(lv);
    const isMyPost =
      item.user_id === session?.user?.id || myProfile?.is_admin === true;

    return (
      <Animated.View
        style={[
          styles.postCard,
          {
            backgroundColor: theme.card,
            borderColor: isRgbTheme ? animatedRgbColor : theme.border,
          },
        ]}
      >
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            onPress={() => router.push(`/user/${item.user_id}`)}
          >
            <AvatarWithFrame
              avatarUrl={author?.avatar_url}
              username={author?.username}
              frameId={author?.equipped_frame || "none"}
              size={42}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <Text style={[styles.username, { color: theme.text }]}>
                  {author?.username || "Gamer"}
                </Text>
                {author?.is_dev && (
                  <View style={styles.devBadge}>
                    <Text style={styles.devBadgeText}>DEV</Text>
                  </View>
                )}
                {author?.is_admin && (
                  <View
                    style={[styles.devBadge, { backgroundColor: "#ef4444" }]}
                  >
                    <Text style={styles.devBadgeText}>ADMIN</Text>
                  </View>
                )}
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>
                    LV.{lv} {rank}
                  </Text>
                </View>
              </View>
              <Text style={[styles.postTime, { color: theme.subText }]}>
                {new Date(item.created_at).toLocaleString("th-TH")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ปุ่มลบโพสต์ของตัวเอง */}
          {isMyPost && (
            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={() => handleDeletePost(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/community/${item.id}`)}
        >
          {item.content ? (
            <Text style={[styles.postContent, { color: theme.text }]}>
              {item.content}
            </Text>
          ) : null}

          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.postImage} />
          ) : null}
        </TouchableOpacity>

        {/* แถบกดหัวใจ และ Comment Reply */}
        <View style={[styles.postFooter, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => handleToggleLike(item)}
          >
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={22}
              color={item.isLiked ? "#ef4444" : theme.subText}
            />
            <Text
              style={[
                styles.footerBtnText,
                { color: item.isLiked ? "#ef4444" : theme.subText },
              ]}
            >
              {item.likeCount} ถูกใจ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => openCommentModal(item)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={theme.subText}
            />
            <Text style={[styles.footerBtnText, { color: theme.subText }]}>
              {item.commentCount} ตอบกลับ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => router.push(`/community/${item.id}`)}
          >
            <Ionicons name="open-outline" size={18} color={theme.accent} />
            <Text style={[styles.footerBtnText, { color: theme.accent }]}>
              Thread
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ==================== HEADER แบบเดิม + ปุ่มกล่องข้อความมุมขวาบน ==================== */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Community {theme.emoji}
          </Text>
          <Text style={{ color: theme.subText, fontSize: 12 }}>
            พูดคุยแชทโลกและแชทส่วนตัวกับเพื่อน
          </Text>
        </View>

        {/* ปุ่มกล่องข้อความ (Inbox) แยกต่างหากที่มุมขวาบน */}
        <TouchableOpacity
          style={[
            styles.inboxBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => {
            if (session) fetchInboxNotifications(session.user.id);
            setInboxModalVisible(true);
          }}
        >
          <Ionicons name="mail-unread-outline" size={22} color={theme.text} />
          {totalInboxCount > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>
                {totalInboxCount > 99 ? "99+" : totalInboxCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ==================== แถบสลับโหมด: แชทโลก vs แชทส่วนตัว ==================== */}
      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "world" && { backgroundColor: theme.accent },
          ]}
          onPress={() => {
            setActiveTab("world");
            setActiveChatPartner(null);
          }}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={activeTab === "world" ? "#fff" : theme.subText}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "world" ? "#fff" : theme.subText },
            ]}
          >
            แชทโลก ({posts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "private" && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveTab("private")}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === "private" ? "#fff" : theme.subText}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "private" ? "#fff" : theme.subText },
            ]}
          >
            แชทส่วนตัว & เพื่อน ({friendsList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==================== เนื้อหาแท็บที่ 1: แชทโลก (World Chat) ==================== */}
      {activeTab === "world" && (
        <>
          <View
            style={[
              styles.createPostBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="โพสต์พูดคุยในแชทโลก... (รับ +1 LV.)"
                placeholderTextColor={theme.subText}
                value={newPost}
                onChangeText={setNewPost}
              />
              <TouchableOpacity
                onPress={pickImageForPost}
                style={styles.attachBtn}
              >
                <Ionicons name="image-outline" size={24} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent }]}
                onPress={handleCreatePost}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {postImage && (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: postImage }} style={styles.previewImg} />
                <TouchableOpacity
                  style={styles.removePreview}
                  onPress={() => setPostImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderWorldPost}
              contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* ==================== เนื้อหาแท็บที่ 2: แชทส่วนตัว & เพื่อน ==================== */}
      {activeTab === "private" && (
        <View style={{ flex: 1 }}>
          {!activeChatPartner ? (
            <FlatList
              data={chatHistoryList}
              keyExtractor={(item) => item.partner.id}
              contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
              ListHeaderComponent={
                <View>
                  {/* ช่องค้นหาผู้เล่นเพื่อเพิ่มเพื่อนหรือทักแชท */}
                  <View
                    style={[
                      styles.searchBox,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons name="search" size={20} color={theme.subText} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.text }]}
                      placeholder="ค้นหาชื่อผู้เล่นเพื่อเพิ่มเพื่อนหรือทักแชท..."
                      placeholderTextColor={theme.subText}
                      value={searchQuery}
                      onChangeText={handleSearchPlayers}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={theme.subText}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* ผลการค้นหาผู้เล่น */}
                  {searchResults.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <Text
                        style={[styles.sectionTitle, { color: theme.text }]}
                      >
                        ผลการค้นหาผู้เล่น
                      </Text>
                      {searchResults.map((u) => {
                        const isAlreadyFriend = friendsList.some(
                          (f) => f.id === u.id,
                        );
                        return (
                          <View
                            key={u.id}
                            style={[
                              styles.chatPartnerCard,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <TouchableOpacity
                              onPress={() => router.push(`/user/${u.id}`)}
                            >
                              <AvatarWithFrame
                                avatarUrl={u.avatar_url}
                                username={u.username}
                                frameId={u.equipped_frame || "none"}
                                size={44}
                              />
                            </TouchableOpacity>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text
                                style={[styles.username, { color: theme.text }]}
                              >
                                {u.username}
                              </Text>
                              <Text
                                style={{
                                  color: "#ffaa00",
                                  fontSize: 11,
                                  fontWeight: "bold",
                                }}
                              >
                                LV.{u.level || 1} {getRankName(u.level || 1)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              {!isAlreadyFriend && (
                                <TouchableOpacity
                                  style={styles.addFriendSmallBtn}
                                  onPress={() => handleAddFriend(u.id)}
                                >
                                  <Ionicons
                                    name="person-add"
                                    size={16}
                                    color="#fff"
                                  />
                                  <Text
                                    style={{
                                      color: "#fff",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    เพิ่มเพื่อน
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[
                                  styles.addFriendSmallBtn,
                                  { backgroundColor: theme.accent },
                                ]}
                                onPress={() => openPrivateChatRoom(u)}
                              >
                                <Ionicons
                                  name="chatbubble-ellipses"
                                  size={16}
                                  color="#fff"
                                />
                                <Text
                                  style={{
                                    color: "#fff",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                  }}
                                >
                                  แชท
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* แถบรายชื่อเพื่อนของคุณ */}
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    เพื่อนของฉัน ({friendsList.length})
                  </Text>
                  {friendsList.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 20 }}
                    >
                      {friendsList.map((f) => (
                        <TouchableOpacity
                          key={f.id}
                          style={styles.friendCircleItem}
                          onPress={() => openPrivateChatRoom(f)}
                        >
                          <AvatarWithFrame
                            avatarUrl={f.avatar_url}
                            username={f.username}
                            frameId={f.equipped_frame || "none"}
                            size={54}
                          />
                          <Text
                            style={[
                              styles.friendCircleName,
                              { color: theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {f.username}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text
                      style={{
                        color: theme.subText,
                        marginBottom: 20,
                        fontStyle: "italic",
                      }}
                    >
                      ยังไม่มีรายชื่อเพื่อน ค้นหาชื่อเพื่อนด้านบนได้เลย
                    </Text>
                  )}

                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    ห้องแชทส่วนตัว ({chatHistoryList.length})
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const p = item.partner;
                const lv = p?.level || 1;
                return (
                  <TouchableOpacity
                    style={[
                      styles.chatPartnerCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => openPrivateChatRoom(p)}
                  >
                    <AvatarWithFrame
                      avatarUrl={p?.avatar_url}
                      username={p?.username}
                      frameId={p?.equipped_frame || "none"}
                      size={48}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={[styles.username, { color: theme.text }]}>
                          {p?.username || "Gamer"}
                        </Text>
                        {p?.is_dev && (
                          <View style={styles.devBadge}>
                            <Text style={styles.devBadgeText}>DEV</Text>
                          </View>
                        )}
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>
                            LV.{lv} {getRankName(lv)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          color: theme.subText,
                          fontSize: 13,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {item.lastMessage}
                      </Text>
                    </View>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={22}
                      color={theme.accent}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            // หน้าห้องคุยแชทส่วนตัว 1-ต่อ-1 กับเพื่อน
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                style={[
                  styles.privateRoomHeader,
                  {
                    backgroundColor: theme.card,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setActiveChatPartner(null)}
                  style={{ padding: 6, marginRight: 8 }}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                  onPress={() => router.push(`/user/${activeChatPartner.id}`)}
                >
                  <AvatarWithFrame
                    avatarUrl={activeChatPartner.avatar_url}
                    username={activeChatPartner.username}
                    frameId={activeChatPartner.equipped_frame || "none"}
                    size={38}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.username, { color: theme.text }]}>
                      {activeChatPartner.username}
                    </Text>
                    <Text
                      style={{
                        color: "#ffaa00",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      LV.{activeChatPartner.level || 1}{" "}
                      {getRankName(activeChatPartner.level || 1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <FlatList
                ref={privateListRef}
                data={privateMessages}
                keyExtractor={(m) => m.id.toString()}
                contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
                onContentSizeChange={() =>
                  privateListRef.current?.scrollToEnd({ animated: true })
                }
                renderItem={({ item: msg }) => {
                  const isMe = msg.sender_id === session?.user?.id;
                  return (
                    <View
                      style={[
                        styles.msgBubble,
                        isMe
                          ? {
                              alignSelf: "flex-end",
                              backgroundColor: theme.chatBubbleMe,
                            }
                          : {
                              alignSelf: "flex-start",
                              backgroundColor: theme.chatBubbleOther,
                              borderWidth: 1,
                              borderColor: theme.border,
                            },
                      ]}
                    >
                      {msg.message ? (
                        <Text style={{ color: theme.text, fontSize: 15 }}>
                          {msg.message}
                        </Text>
                      ) : null}
                      {msg.image_url ? (
                        <Image
                          source={{ uri: msg.image_url }}
                          style={styles.msgImage}
                        />
                      ) : null}
                    </View>
                  );
                }}
              />

              {privateImage && (
                <View style={styles.privatePreviewBar}>
                  <Image
                    source={{ uri: privateImage }}
                    style={{ width: 60, height: 60, borderRadius: 8 }}
                  />
                  <TouchableOpacity onPress={() => setPrivateImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}

              <View
                style={[
                  styles.privateInputBar,
                  { backgroundColor: theme.card, borderTopColor: theme.border },
                ]}
              >
                <TouchableOpacity
                  onPress={pickImageForPrivateChat}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={theme.accent}
                  />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.privateInput,
                    { backgroundColor: theme.bg, color: theme.text },
                  ]}
                  placeholder={`ส่งข้อความถึง ${activeChatPartner.username}...`}
                  placeholderTextColor={theme.subText}
                  value={privateText}
                  onChangeText={setPrivateText}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: theme.accent }]}
                  onPress={handleSendPrivateMessage}
                  disabled={sendingPrivate}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODAL กล่องข้อความ (INBOX) - แยกจากแชทส่วนตัว อยู่ที่มุมขวาบน */}
      {/* ========================================================================= */}
      <Modal
        visible={inboxModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="mail-unread" size={22} color="#facc15" />
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  กล่องข้อความ (Inbox)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInboxModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* แท็บย่อยในกล่องข้อความ */}
            <View
              style={[
                styles.tabBar,
                { backgroundColor: theme.bg, marginHorizontal: 0 },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  inboxSubTab === "alerts" && { backgroundColor: theme.accent },
                ]}
                onPress={() => setInboxSubTab("alerts")}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: inboxSubTab === "alerts" ? "#fff" : theme.subText,
                    },
                  ]}
                >
                  แจ้งเตือนแชท & โพสต์ (
                  {incomingMsgAlerts.length + postActivityAlerts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  inboxSubTab === "requests" && {
                    backgroundColor: theme.accent,
                  },
                ]}
                onPress={() => setInboxSubTab("requests")}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        inboxSubTab === "requests" ? "#fff" : theme.subText,
                    },
                  ]}
                >
                  คำขอเป็นเพื่อน ({incomingFriendReqs.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {inboxSubTab === "alerts" ? (
                incomingMsgAlerts.length === 0 &&
                postActivityAlerts.length === 0 ? (
                  <Text
                    style={{
                      color: theme.subText,
                      textAlign: "center",
                      marginTop: 40,
                    }}
                  >
                    ยังไม่มีการแจ้งเตือนใหม่ในกล่องข้อความ
                  </Text>
                ) : (
                  <>
                    {/* 1. แจ้งเตือนข้อความส่วนตัวที่ทักเข้ามา */}
                    {incomingMsgAlerts.map((alert) => (
                      <TouchableOpacity
                        key={`msg_${alert.id}`}
                        style={[
                          styles.inboxCard,
                          {
                            backgroundColor: theme.bg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => {
                          setInboxModalVisible(false);
                          setActiveTab("private");
                          openPrivateChatRoom(alert.sender);
                        }}
                      >
                        <AvatarWithFrame
                          avatarUrl={alert.sender?.avatar_url}
                          username={alert.sender?.username}
                          frameId={alert.sender?.equipped_frame || "none"}
                          size={42}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "bold",
                              fontSize: 14,
                            }}
                          >
                            💬 {alert.sender?.username} ทักแชทส่วนตัวหาคุณ
                          </Text>
                          <Text
                            style={{
                              color: theme.subText,
                              fontSize: 13,
                              marginTop: 3,
                            }}
                            numberOfLines={1}
                          >
                            "{alert.message}"
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={theme.accent}
                        />
                      </TouchableOpacity>
                    ))}

                    {/* 2. แจ้งเตือนคนมาคอมเมนต์โพสต์แชทโลกของเรา */}
                    {postActivityAlerts.map((act) => (
                      <TouchableOpacity
                        key={`cmt_${act.id}`}
                        style={[
                          styles.inboxCard,
                          {
                            backgroundColor: theme.bg,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => {
                          setInboxModalVisible(false);
                          router.push(`/community/${act.postId}`);
                        }}
                      >
                        <AvatarWithFrame
                          avatarUrl={act.user?.avatar_url}
                          username={act.user?.username}
                          frameId={act.user?.equipped_frame || "none"}
                          size={42}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "bold",
                              fontSize: 14,
                            }}
                          >
                            🔔 {act.user?.username} ตอบกลับโพสต์ของคุณ
                          </Text>
                          <Text
                            style={{
                              color: theme.subText,
                              fontSize: 13,
                              marginTop: 3,
                            }}
                            numberOfLines={1}
                          >
                            "{act.content}"
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#10b981"
                        />
                      </TouchableOpacity>
                    ))}
                  </>
                )
              ) : incomingFriendReqs.length === 0 ? (
                <Text
                  style={{
                    color: theme.subText,
                    textAlign: "center",
                    marginTop: 40,
                  }}
                >
                  ไม่มีคำขอเป็นเพื่อนใหม่
                </Text>
              ) : (
                incomingFriendReqs.map((req) => (
                  <View
                    key={req.rowId}
                    style={[
                      styles.inboxCard,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                    ]}
                  >
                    <AvatarWithFrame
                      avatarUrl={req.user?.avatar_url}
                      username={req.user?.username}
                      frameId={req.user?.equipped_frame || "none"}
                      size={44}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        {req.user?.username}
                      </Text>
                      <Text style={{ color: theme.subText, fontSize: 12 }}>
                        เพิ่มคุณเป็นเพื่อนแล้ว
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={styles.acceptFriendBtn}
                        onPress={() => handleAcceptFriendInInbox(req.user.id)}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          รับแอด
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineFriendBtn}
                        onPress={() => handleDeclineFriendInInbox(req.rowId)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL ตอบกลับคอมเมนต์โพสต์แชทโลก (Comment Reply) */}
      {/* ========================================================================= */}
      <Modal
        visible={replyModalVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                คอมเมนต์ตอบกลับ ({postComments.length})
              </Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.accent} />
              </View>
            ) : (
              <FlatList
                data={postComments}
                keyExtractor={(c) => c.id.toString()}
                contentContainerStyle={{ paddingVertical: 10 }}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: theme.subText,
                      textAlign: "center",
                      marginTop: 30,
                    }}
                  >
                    ยังไม่มีคอมเมนต์ตอบกลับ
                  </Text>
                }
                renderItem={({ item: c }) => {
                  const cLv = c.author?.level || 1;
                  const canDeleteCmt =
                    c.user_id === session?.user?.id ||
                    myProfile?.is_admin === true;

                  return (
                    <View
                      style={[
                        styles.inboxCard,
                        {
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AvatarWithFrame
                        avatarUrl={c.author?.avatar_url}
                        username={c.author?.username}
                        frameId={c.author?.equipped_frame || "none"}
                        size={36}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "bold",
                              fontSize: 14,
                            }}
                          >
                            {c.author?.username || "Gamer"}
                          </Text>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>
                              LV.{cLv} {getRankName(cLv)}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 14,
                            marginTop: 4,
                          }}
                        >
                          {c.content}
                        </Text>
                      </View>
                      {canDeleteCmt && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(c.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}

            <View
              style={[styles.replyInputRow, { borderTopColor: theme.border }]}
            >
              <TextInput
                style={[
                  styles.privateInput,
                  { backgroundColor: theme.bg, color: theme.text },
                ]}
                placeholder="พิมพ์คอมเมนต์ตอบกลับ..."
                placeholderTextColor={theme.subText}
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent }]}
                onPress={handleSendComment}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  inboxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  inboxBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  inboxBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 15,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: "bold" },

  createPostBox: {
    margin: 15,
    marginBottom: 5,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  attachBtn: { padding: 6 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  previewWrapper: {
    marginTop: 10,
    width: 100,
    height: 100,
    position: "relative",
  },
  previewImg: { width: "100%", height: "100%", borderRadius: 10 },
  removePreview: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#000",
    borderRadius: 12,
  },

  postCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  username: { fontSize: 16, fontWeight: "bold" },
  postTime: { fontSize: 11, marginTop: 2 },
  deleteIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
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
  rankText: { color: "#ffaa00", fontSize: 10, fontWeight: "bold" },
  postContent: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 10 },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
    resizeMode: "cover",
  },

  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  footerBtnText: { fontSize: 13, fontWeight: "bold" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  friendCircleItem: { alignItems: "center", marginRight: 16, width: 70 },
  friendCircleName: { fontSize: 12, marginTop: 6, textAlign: "center" },
  chatPartnerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  addFriendSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },

  privateRoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  msgBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  msgImage: { width: 180, height: 180, borderRadius: 10, marginTop: 6 },
  privatePreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  privateInputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  privateInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  inboxCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  acceptFriendBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineFriendBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 8,
    borderRadius: 8,
  },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
});
