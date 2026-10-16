import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { CameraModeCard } from "../../components/FamilyActions";
import { Rise } from "../../components/motion";
import { dateLabel } from "../../lib/events";
import { useAuth } from "../../providers/AuthProvider";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  BackBar,
  Button,
  colors,
  deviceIcon,
  DevicePill,
  Empty,
  fonts,
  kindLabel,
  ListGroup,
  ListRow,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

/** The web's cameras page: every device, adding one and what to do when one drops out. */
export default function DevicesScreen() {
  const data = useData();
  const { household } = useHomes();
  const { session } = useAuth();
  const online = data.devices.filter((device) => device.status === "online").length;
  const owner = household?.owner_id === session?.user.id;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            tintColor={colors.primary}
            onRefresh={() => void data.refresh()}
          />
        }
      >
        <BackBar title="Төхөөрөмжүүд" />
        <Text style={styles.muted}>
          {data.devices.length} камераас {online} онлайн
        </Text>
        {owner && (
          <Rise>
            <Button title="Камер нэмэх" onPress={() => router.push("/devices/new")} />
          </Rise>
        )}
        {data.error && <Problem text={data.error} retry={() => void data.refresh()} />}
        <Rise index={1}>
          {data.devices.length ? (
            <ListGroup>
              {data.devices.map((device) => (
                <ListRow
                  key={device.id}
                  icon={deviceIcon(device.kind)}
                  tone={device.status === "online" ? undefined : "warn"}
                  title={device.name}
                  description={`${device.room_name || "Өрөө тодорхойгүй"} · ${kindLabel[device.kind]} · ${
                    device.last_seen_at ? dateLabel(device.last_seen_at) : "Холбогдоогүй"
                  }`}
                  trailing={<DevicePill device={device} />}
                  onPress={() => router.push(`/devices/${device.id}`)}
                />
              ))}
            </ListGroup>
          ) : (
            <Empty
              icon="videocam-outline"
              title="Эхний камераа холбоорой"
              hint="Ашиглахгүй байгаа утас эсвэл компьютерээр өрөөгөө хянаж болно. Камер нэмээд холбох код үүсгээрэй."
            />
          )}
        </Rise>
        {data.devices.some((device) => device.status === "offline") && (
          <Rise index={2} style={[styles.card, { flexDirection: "row", gap: 12, borderColor: `${colors.warningButton}40` }]}>
            <Ionicons name="cloud-offline-outline" size={24} color={colors.warning} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.text, { fontFamily: fonts.bold }]}>
                Камерын холболт тасарсан
              </Text>
              <Text style={styles.muted}>
                Камераас дор хаяж 90 секунд холболтын дохио ирээгүй байна. Холболт тасарсан
                үед шинэ анхааруулга илгээх боломжгүй.
              </Text>
              <Text style={[styles.muted, { fontSize: 13 }]}>
                Цэнэг болон интернэтийг нь шалгаарай. Камерын хуудсыг нээлттэй, дэлгэцийг
                асаалттай байлгаарай. Дохио дахин ирэхэд холболт сэргэнэ.
              </Text>
            </View>
          </Rise>
        )}
        <Rise index={3}>
          <CameraModeCard />
        </Rise>
      </ScrollView>
    </Screen>
  );
}
